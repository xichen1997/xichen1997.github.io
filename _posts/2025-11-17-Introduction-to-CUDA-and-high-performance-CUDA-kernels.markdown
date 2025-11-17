---
layout: post
title: "Add array support for DSL on Minimal CPU"
date: 2025-11-16 00:06:00 +0000
categories: computer_science
---
# Kernel comparison with a MMA in CUDA and near-SOTA/cuBLAS performance kernel 
The project is hosted in the repository:
[CUDA-refresh](https://github.com/xichen1997/CUDA-refresh)

## Introduction

The kernel is the "kernel" in the concept of CUDA, it directly influence the compute efficiency and it's the key to take advanage of GPU's huge amount of computation resource and bandwidth.

Here is a simple refresh of the CUDA calculation and memory hierachy and their infleunce to the computation efficiency.

In the tutorial, several concepts will be compare like \(threads \| blocks\) numbers, warp, shared memory, and double buffering(not finished yet). 

## Setup before doing the matrix computation.

In this section, multiple benchmark will be applied on different kernels like the performance, including kernel Size, matrix size and the way how we use memory(shared memory or L2 cache, etc)

We only focus on the kernel of MMA so the main functions are almost the same in each kernels' benchmark.

You can check the `main.cu` in each steps folder to check how the benchmark is run. They should be pretty straight forward. And if you want to test, make sure you have an NVIDIA GPU(The current compilation only support RTX 30 series and 40 series, if you want backward compatibility please change the compliation switch `-arch=sm89` to previous version.) 

`benchmark.sh` will be used to measure the time spent on creating matrix and cuda computation seperately by timing. You can run `make benchmark` to get the logs\/ folder and check its running result with different size of matrix. 

In the heavy profiling stage we will use `ncu` to do the benchmark, it can show us how much \% we use for the GPU's SM units, please refer to the [documentation](https://docs.nvidia.com/nsight-compute/NsightComputeCli/index.html) at Nvidia. Call it with `make benchmark-heavy`


## Naive kernel - write first kernel function in CUDA

In this section, the MMA(matrix multiplication) is implemented in a very simple way. Compared to write in CPU, in GPU, we parallelize the first two loops and each thread calculate the result for a single element in C.
$$C[i][j] = \sum_k A[i][k] * B[k][j]$$

It's easy to write the kernel: for each thread, we calculate the row and col accoding to the threadIdx.x and threadIdx.y. 

Note: The size of the blockDim.x * blockDim.y * blockDim.z <= 2048(phsical threads limitation). But the Grid size can be set to a large number like 64k(It's just a logic dimension to distribute different tasks to different threads).

Each threads or warp(a group of threads which will be covered later) will gover a certain range of the problems which can be parallel, like in the matrix multiplication, naive kernel each thread will be responsible for calculate one element in C use `A[i][:] * B[:][j]`. 

In the `main.cu` file in step-1, we can use the matrix dimension to decide the grid size:
```c++
    // make sure one block is multiple of 32 for better performance, 32 threads is in a warp
    dim3 blockSize(32, 32);
    dim3 gridSize((N + blockSize.x - 1) / blockSize.x,
                  (M + blockSize.y - 1) / blockSize.y); // always generate more than enough to prevent the task scale is not enough to cover the C matrix scale.
```

In this place I use 32x32 = 1024 threads in each block. 
### Tips: the CUDA hardware and memory hierachy, use RTX 4090(ada arch) as an example

GPU has more parallel computing capacity compared to CPU. In CUDA, the calculation style is SIMT(single instructions multiple threads), compared to SIMD(single instruction multiple data), each threads has their own registers. 

And 32 threads are grouped together to execute the same instruction together, so the minimal schedule unit is warp not thread in the GPU. 

The warps/threads can be logically grouped into a block, the threads number must be a multiple of 32. And SM(Streaming Multiprocessor) can execute the block, one SM has certain numbers of hardware like shared memory and registers, which will decide how many blocks can run on a SM. (note 1 block can only be a resident in 1 SM) 

For example, Ada Lovelace GPU(RTX 4090) has 128 SMs. Each SM has 64k registers and 100KB shared memory(shared with L1 cache), 2048 threads. That's the phsical limitation. Note, L2 cache is shared by all SMs, not exclusive to one SM.

And each SM has 4 warp schedulers, which means it can issue 4 instruction to warps at the same cycle. Thus, block at least should have 4 warps to maxmize the performance of each SM.

The GPU is connected to HBM(24GB for RTX 4090) which bandwidth reaches 1008GB/s. That's the phsical limitation of the data flow and decide how many calculation we can do.


Then we should take a look into how the block size and grid size to match the matrix size:
In CUDA, for the row we calculate use `row = threadIdx.y + blockIdx.y * blockDim.y` and `col = threadIdx.x + blockIdx.x * blockDim.x` if we use 2D representation because that's the rules in CUDA. That's might be unintuitive at the beginning but you can think in this way: the thread should be continous along x then y, so in the matrix, the matrix is row-major, so the changing of x reflect the change of col. They are trying to improve cache locality.


### Back to the naive kernel

After introduce the memory layout and rules it should be easy to write the kernel:

```c++
__global__ void kernel1(const float* A, const float* B, float* C,
                                const int M, const int N, const int K){
    int row = blockIdx.y * blockDim.y + threadIdx.y;
    int col = blockIdx.x * blockDim.x + threadIdx.x;
    float sum = 0.0f;
    if(row < M && col < K){ // prevent over the boundary
        for(int i = 0; i < N; ++i){
            sum += A[row * N + i] * B[i * K + col];
        }
    }
    C[row * N + col] = sum;
}
```

After running the `make benchmark` we can check the result in the log, for the 8192 * 8192 matrix size, the computational timing and allocation timings are:
```bash
Matrix size: 8192x8192 * 8192x8192
------------------time used ----------------------

Initialization time: 0.457656 seconds
Computation time: 0.256279 seconds

--------------------------------------------------
```

## Can we make it better?

The answer is yes, recall how the array is stored in C++. It's row major, which means the memory address is continuous for each row.

```c++
int arr[2][4] = { {1,2,3,4} ,{ 5,6,7,8} };
// a[0][0] a[0][1] a[0][2] a[0][3] they are continuous.
// &a[1][0] - &a[0][0] = 4(stride)
```

So why don't we store B in col-major? It means we still take the logic `B[row][col]` but they are not align with their phsical location. Assuming the B is KxN matrix, then the `B[row][col] = B'[col * K + row]` in 1D.

The experienment can be done quickly in step-2, we change how we allocate memory to the matrix B(transpose it before do cuda memory copy):

```c++
    for(int i = 0; i < K; ++i){
        for(int j = 0; j < N; ++j){
            h_B[j * K + i] = static_cast<float>(i * K + j);
        }
    }
```
remember we transpose B already so $B[j][i] = B^T[i][j] = B^[i*K+j]$
$$ C_{ij} = /sum_k A_{ik} * B_{kj} = /sum_k A[row * K + i] * B[col * K + j] $$

The kernel is:
```c++
__global__ void kernel2(const float* A, const float* B, float* C,
                                const int M, const int N, const int K){
    int row = blockIdx.y * blockDim.y + threadIdx.y;
    int col = blockIdx.x * blockDim.x + threadIdx.x;
    float sum = 0.0f;
    if(row < M && col < K){
        for(int i = 0; i < N; ++i){
            sum += A[row * K + i] * B[col * K + i];
        }
    }
    C[row * K + col] = sum;
}
```

That's should work, let's see the result for the 8192 dimension compare to naive kernel:
```bash
Matrix size: 8192x8192 * 8192x8192
------------------time used ----------------------

Initialization time: 0.554599 seconds
Computation time: 1.65866 seconds

--------------------------------------------------
```
Wait?!  Why it needs more time than naive kernel??? 

### analysis of memory access pattern

We know the cache locality will define the calculation, why the pattern fail in this case? 

The answer is we are using a lot of different threads to calculate it, each threads represents a different row, col. Inside a warp, all the threads ids are continuous, they are accessing the same row and different cols.

And inside a kernel, at the same time they are accessing the data: `sum += A[row * K + i] * B[col * K + i];`, different threads will use different col, and their stride is K which is 8192 and this cause all the threads could reuse data another threads access. 

Warp has a feature called data coelesing, which means if threads inside a warp are accessing the continuous memory, they can combine the requests into a single one.


That explains why the performance dropped a lot, it improves the single threads efficiency but require too much bandwidth.

### Try 1D access pattern
Open step-4 to do same experiment with step-1 but represent the matrix in 1D, you will find the performance improve a little bit, but not too much


## Tiled-matrix: Improve the data transfer efficiency to boost computation.

After we know the properties of warp and block(all the threads in a block can use the same shared_memory), we can conside data reuse. 

Recall what we have done in the naive kernel:
$$C[i][j] = \sum_k A[i][k] * B[k][j]$$

each thread use their own memory, which requires a row of A and a col of B, which is a huge waste. What can we do better? Tiled memory calculate, assuming we are taking a band of 16 x K of A and K x 16 of B to calculate the 16x16 of C_blocks matrix.

Of course we are using block matrix multiplication, we can't store the two bands of matrix together but when we iterate over K dimension, assuming the stride is 16, then we need a loop for K / 16 times, and each time we put the 16x16 A and 16x16 B tiles into shared memory to do mma add to C block(16x16). 

How many times we can reuse it? 16 * 16 * 16 (calculation FLOPS) / 2 * 16 * 16 (the A tile and B tile) = 8 times, that's a huge boost, we can extend the number to 32, 64, etc, with larger tile. However, the tile can not expand infinitely because of the limitation of 100KB limitation(SRAM is very expensive!).

The best size in RTX 4090 is about 128x128 or 256 * 64, you can run and compare the step-6 and step-5 for comparison, of course in 5 the block size is 16 x 16 and it cause extra overhead to move the data into the shared memory and that offset the benefit of data reuse. 

Here is the kernel for 32 x 32 C block size, you can try different block size and benchmark thems.


Notice the loading process is complete by all the threads in the blocks. You can use the size of A or B blocks / threads number to decide which thread load a certain or several elements of a matrix.
```c++
#include <cuda_runtime.h>
#include <iostream>

// Kernel function to do naive matrix multiplication
// A[i][j] = i * N + j;
// B[i][j] = i * K + j;
# define TILE 32
__global__ void kernel_tile(const float* A, const float* B, float* C,
                                const int M, const int N, const int K){
    // inside of a tile, local index
    int tx = threadIdx.x;
    int ty = threadIdx.y;
    // block index
    int bx = blockIdx.x;
    int by = blockIdx.y;
    // global row and col index
    int row = by * TILE + ty;
    int col = bx * TILE + tx;
    float sum = 0.0f;
    
    __shared__ float As[TILE][TILE];
    __shared__ float Bs[TILE][TILE];
    // loop over all tiles
    for(int t = 0; t < (K + TILE - 1) / TILE; ++t){
        // load A and B tiles into shared memory
        // each thread loads one element of each tile
        if(row < M && t * TILE + tx < K){
            As[ty][tx] = A[row * K + t * TILE + tx];
        }else{
            As[ty][tx] = 0.0f;
        }
        if(col < N && t * TILE + ty < K){
            Bs[ty][tx] = B[(t * TILE + ty) * K +  col];
        }else{
            Bs[ty][tx] = 0.0f;
        }
        __syncthreads();
        // compute partial sum for this tile
        for(int i = 0; i < TILE; ++i){
            sum += As[ty][i] * Bs[i][tx];
        }
        __syncthreads();
    }
    // write back the result
    if(row < M && col < N){
        C[row * N + col] = sum;
    }
}
```

## Warp level matrix multiplication - the secrets of new GPU architecture

Currently the CUDA cores (which are the normal ALU elements) in the SM can do a lot of operations, but 90% of calculation in deep learning are matrix multiplication. Thus, a new warp-level of hardware is introduced, tensor core, we need use warp to schedule it.

Within a cycle, normal warp can do 64 FLOPS, but tensor core can do 512 FLOPS for a 16 x 16 matrix. (which is 8x boost.)


To use the kernel, we need to define the fragments(16x16) of A, B and C:
```c++
    // define tensor core fragment
    wmma::fragment<wmma::matrix_a, TILE, TILE, TILE, half, wmma::row_major> a_frag;
    wmma::fragment<wmma::matrix_b, TILE, TILE, TILE, half, wmma::row_major> b_frag;
    wmma::fragment<wmma::accumulator, TILE, TILE, TILE, float> c_frag;
```
F
At this stage, we should divide a sub sub matrix in C for the warp to control, for simplicity, we assume the block size is 16 x 16 and the warp control all the block, then we can have the kernel to boost the 16 x 16 tiled matrix multiplication by:

$$C_sub = A[16][:] @ B[:][16] = A[16][0..15] @ [0..15][16] +  A[16][16..31] @ [16..31][16] + ...$$

Here is the kernel:
```c++
#include <cuda_runtime.h>
#include <iostream>


#include <mma.h> // for wmma
#include <cuda_fp16.h> // for half

using namespace nvcuda;

// Kernel function to do naive matrix multiplication
// A[i][j] = i * N + j;
// B[i][j] = i * K + j;
# define TILE 16
__global__ void kernel_tile(const half * A, const half * B, float* C,
                                const int M, const int N, const int K){
    
    // define tensor core fragment
    wmma::fragment<wmma::matrix_a, TILE, TILE, TILE, half, wmma::row_major> a_frag;
    wmma::fragment<wmma::matrix_b, TILE, TILE, TILE, half, wmma::row_major> b_frag;
    wmma::fragment<wmma::accumulator, TILE, TILE, TILE, float> c_frag;

    // initialization of C fragment
    wmma::fill_fragment(c_frag, 0.0f);

    int block_row = blockIdx.y;
    int block_col = blockIdx.x;

    const half *A_ptr = A + block_row * TILE * K;
    const half *B_ptr = B + block_col * TILE;
    
    for(int i = 0; i < K; i += TILE){
        // load the intput matrices A and B to fragments
        wmma::load_matrix_sync(a_frag, A_ptr, K);
        wmma::load_matrix_sync(b_frag, B_ptr, N);
        // perform the matrix multiplication
        wmma::mma_sync(c_frag, a_frag, b_frag, c_frag);

    }
    // calculate the starting row and column index of C matrix
    float * c_ptr = C + block_row * TILE * N + block_col * TILE;

    // write memory back to C
    // fix the error: no matching function for call to 'store_matrix_sync'
    wmma::store_matrix_sync(c_ptr, c_frag, N, wmma::mem_row_major);

}
```


## Final steps - combine warp level matrix multiplication and shared memory

In this way, we know how to use data better to boost the bandwidth. Then the wmma can be used with shared memory, in this case we use 128 x 128 x 32 kernel (A tile is 128 x 32, B tile is 32 x 128 and C tile is 128 x 128 to save shared memory). The shared memory usage is 128 * 32 * 2 = 8192 elements and 16KB usage(for half data type is 2 Bytes) which is pretty good, it will not pressure L1 cache a lot and can hold 2-4 blocks in a SM.


Here is the kernel, notice each block control 128 x 128 matrix, and 16 warps will consumes this. Each warp get 32 x 32 warp level tile matrix, it should be divided into 4 fragments matrix and do the calculation. Here is the kernel, you can also try it in step-12.

```c++
#include <cuda_runtime.h>
#include <iostream>
#include <mma.h> // for wmma
#include <cuda_fp16.h> // for half

using namespace nvcuda;

// warp size wichi is constant 16 x 16 x 16
#define WARP_M 16
#define WARP_N 16
#define WARP_K 16

// block tile size
#define BLOCK_M 128 // 8 * WARP_M
#define BLOCK_N 128 // 8 * WARP_N
#define BLOCK_K 32  // 8 * WARP_K 

// 
#define WARPS_PER_BLOCK_M 4 // block number of warps in M dimension
#define WARPS_PER_BLOCK_N 4 // block number of warps in N dimension
#define BLOCK_WARPS (WARPS_PER_BLOCK_M * WARPS_PER_BLOCK_N) // 4 * 4 = 16 warps per block
#define BLOCK_THREADS (32 * BLOCK_WARPS) // 32 * 16 = 512 threads per block

// the govern region of C_blocks for each warp
#define WARP_C_TILE_M (BLOCK_M / WARPS_PER_BLOCK_M) // 128 / 4 = 32
#define WARP_C_TILE_N (BLOCK_N / WARPS_PER_BLOCK_N) // 128 / 4 = 32

// number of fragments of C for each warp
#define WARP_C_FRAGS_M (WARP_C_TILE_M / WARP_M) // 32 / 16 = 2
#define WARP_C_FRAGS_N (WARP_C_TILE_N / WARP_N) // 32 / 16 = 2


__global__ void kernel_smem_tile_128x128(const half * A, const half * B, float* C,
                                         const int M, const int N, const int K) {
    // A: (M, K) row-major
    // B: (K, N) col-major
    // C: (M, N) row-major

    // shared memory size for A and B tiles 4096 + 4,096 = 8,192 elements
    // 16KB in total.
    // A tile: (BLOCK_M, BLOCK_K) -> (128, 32) = 4096
    __shared__ half smem_a[BLOCK_M * BLOCK_K];
    // B tile: (BLOCK_K, BLOCK_N) -> (32, 128) = 4096
    __shared__ half smem_b[BLOCK_K * BLOCK_N];
    
    // fragments of A and B
    wmma::fragment<wmma::matrix_a, WARP_M, WARP_N, WARP_K, half, wmma::row_major> a_frag;
    wmma::fragment<wmma::matrix_b, WARP_M, WARP_N, WARP_K, half, wmma::col_major> b_frag;

    // fragmesnts of C (in total 8 fragments per warp)
    wmma::fragment<wmma::accumulator, WARP_M, WARP_N, WARP_K, float> c_frag[WARP_C_FRAGS_M][WARP_C_FRAGS_N];

    // initialization of C fragments in each warp
    for (int m = 0; m < WARP_C_FRAGS_M; ++m) {
        for (int n = 0; n < WARP_C_FRAGS_N; ++n) {
            wmma::fill_fragment(c_frag[m][n], 0.0f);
        }
    }

    // 4 x 4 warps per block
    int warpId = threadIdx.y; // 0..15
    int laneId = threadIdx.x; // 0..31
    
    int block_row_base = blockIdx.y * BLOCK_M;
    int block_col_base = blockIdx.x * BLOCK_N;
    
    // warpId 0, 32, 64 
    int warp_row_offset = (warpId / WARPS_PER_BLOCK_N) * WARP_C_TILE_M; 
    // 0, 32, 64 
    int warp_col_offset = (warpId % WARPS_PER_BLOCK_N) * WARP_C_TILE_N; 

    // thread ID within the block for loading shared memory
    int tid = threadIdx.x + threadIdx.y * blockDim.x; // 0..511

    
    for (int k_tile_idx = 0; k_tile_idx < K; k_tile_idx += BLOCK_K) {
        
        const half *A_gmem_ptr = A + block_row_base * K + k_tile_idx;
        const half *B_gmem_ptr = B + block_col_base * K + k_tile_idx;

        // A (row-major) load
        for (int i = 0; i < (BLOCK_M * BLOCK_K / BLOCK_THREADS); ++i) { // 4096 / 512 = 8
            int idx = tid + i * BLOCK_THREADS;
            int row = idx / BLOCK_K;
            int col = idx % BLOCK_K;
            smem_a[idx] = A_gmem_ptr[row * K + col];
        }

        // B (col-major) load
        for (int i = 0; i < (BLOCK_K * BLOCK_N / BLOCK_THREADS); ++i) { // 4096 / 512 = 8
            int idx = tid + i * BLOCK_THREADS;
            int row = idx / BLOCK_N; // (k-dim)
            int col = idx % BLOCK_N; // (n-dim)
            smem_b[col * BLOCK_K + row] = B_gmem_ptr[col * K + row];
        }

        __syncthreads();

        
        // K-loop (inner): BLOCK_K (32) / WARP_K (16) = 2 
        for(int inner_k = 0; inner_k < BLOCK_K; inner_k += WARP_K){
            
            // calculate all fragments of A(16 x 32) and B(32 x 16) for this warp to compute a C fragment(16x16)
            // so there are total 2 times of wmma iuoperations per 
            for (int m = 0; m < WARP_C_FRAGS_M; ++m) { // 0..
                for (int n = 0; n < WARP_C_FRAGS_N; ++n) { // 0..1
                    
                    // A tile for this warp starts at smem_a[warp_row_offset * BLOCK_K]
                    // M-dim offset: m * WARP_M
                    const half * A_smem_ptr = &smem_a[ (warp_row_offset + m * WARP_M) * BLOCK_K + inner_k ];
                    
                    // B tile for this warp starts at smem_b[warp_col_offset * BLOCK_K]
                    // N-dim offset: n * WARP_N
                    const half * B_smem_ptr = &smem_b[ (warp_col_offset + n * WARP_N) * BLOCK_K + inner_k ];
                    
                    wmma::load_matrix_sync(a_frag, A_smem_ptr, BLOCK_K); // LDM=BLOCK_K (32)
                    wmma::load_matrix_sync(b_frag, B_smem_ptr, BLOCK_K); // LDM=BLOCK_K (32)
                    
                    // accumulate
                    wmma::mma_sync(c_frag[m][n], a_frag, b_frag, c_frag[m][n]);
                }
            }
        }

        __syncthreads(); // synchronize before loading the next tile
    }
    // write back C fragments to global memory
    float * c_ptr_base = C + (block_row_base + warp_row_offset) * N + block_col_base + warp_col_offset;
    
    // write back all C fragments of this warp
    for (int m = 0; m < WARP_C_FRAGS_M; ++m) {
        for (int n = 0; n < WARP_C_FRAGS_N; ++n) {
            float* c_ptr = c_ptr_base + (m * WARP_M) * N + (n * WARP_N); // LDM = N
            wmma::store_matrix_sync(c_ptr, c_frag[m][n], N, wmma::mem_row_major);
        }
    }
}
```

Very interesting facts: 64 x 64 x 64 is the same as 128 * 32 * 128, but we can get a larger C blocks in the second strategy, which is 128 x 128 and this give us more benefits, we prefer to use panel size of tiled matrix to maxmiaze the compututation under a certain amount of bandwidth.


## What could be done next?

As for now, you should have a good understanding of the CUDA and GPU meomry hierachy, but we could still optimize it with async data fetching and double buffering(latency hiding). I will cover it in the later articles.



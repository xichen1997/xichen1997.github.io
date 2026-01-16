---
layout: post
title: "Add array support for DSL on Minimal CPU"
date: 2025-09-19 00:06:00 +0000
categories: computer_science
---

The project is hosted in the repository (section-4):
[minimal_CPU](https://github.com/xichen1997/minimal_turing_complete_CPU)


## Introduction

Currently, the compiler and DSL support the basic calculation like assigning value, reset value, add and substrction operation. However, there is an important part in the language not being supported. It's array. The purpose of this array is to read and write string with more convenience, and it can be used to construct a mini-terminal or shell to interact with the simulated hardware(CPU).


## Basic Design

It's naturally the array is stored continucious and the head of array is the pointer location, and the index is the distance between the first element of the array.

The define of the array require requesting more memory than just one uint_8 memory. Thus, it needs a new instruction, which can be based on the STORE instruction. Inituitively, there should be a special LOAD environment for load the element inside the array.

And it's has been clear that we need more instructions to apply for the memory like:

* Define the length of the array, ARRAY_DECL.
* LOAD_INDEX and STORE_INDEX to load and store value from and to the variables inside the array.

## Usage examples

After adding the array instructions, we should get the usage and examples:

```
# Basic array operations
let arr[5];
arr[0] = 10;
arr[1] = 20;
out arr[0];        # Outputs: 10

# Array with variable indices
let i = 1;
let x = arr[i];    # x = 20
arr[i] = arr[0] + 5; # arr[1] = 15

# Complex expressions
let buffer[100];
let size = 10;
buffer[0] = size * 2;
out buffer[0];     # Outputs: 20
```

## Implementation

### Add two extra tokens:

```c++
case '[': return {TokenType::OP_LBRACKET, "[", startline, startcol};
case ']': return {TokenType::OP_RBRACKET, "]", startline, startcol};
```

### Add a mapping from array first element to corresponding space.

```c++
uint16_t Codegen::allocateArrayViaVar(const std::string& name, uint16_t size) {
    uint16_t base = allocateVar(name);  // get current base
    DATA_CURSOR += (size - 1);          // manually skip full size
    return base;
}
// Then add a map to array first location
case OpCode::ARRAY_DECL: {
            // ARRAY_DECL arrayName, arraySize
            // allocate the array
            uint16_t arraySize = std::stoi(instruction.arg2);
            uint16_t arrayAddress = allocateArrayViaVar(instruction.arg1, arraySize);
            arrMap[instruction.arg1] = {arrayAddress, arraySize};
            break;
        }
```

### LOAD_INDEXED and STORE_INDEXED

The LOAD_INDEXED and STORE_INDEXED can be translated to normal LOAD_VAR and STORE_VAR because they have no difference:
```c++
case OpCode::LOAD_INDEXED: {
    uint16_t indexAddr = allocateVar(instruction.arg2);
    uint16_t resAddr = allocateVar(instruction.result);
    uint16_t baseAddr = arrMap[instruction.arg1].first;

    // load index to R2
    code.push_back(0x01);
    code.push_back(0x02); // R2
    code.push_back(indexAddr >> 8); // addr high
    code.push_back(indexAddr & 0xFF); // addr low
    // Load base address high byte to R0
    code.push_back(0x02);
    code.push_back(0x00); // R0
    code.push_back(baseAddr >> 8); // addr high byte only
    // Load base address low byte to R1  
    code.push_back(0x02);
    code.push_back(0x01); // R1
    code.push_back(baseAddr & 0xFF); // addr low byte

    // LOAD_INDEXED uses: R0 (base), R2 (offset), R4 (dst)
    code.push_back(0x0A);
    // store result to resAddr
    code.push_back(0x03);
    code.push_back(resAddr >> 8); // addr high
    code.push_back(resAddr & 0xFF); // addr low
    code.push_back(0x04); // R4
    break;
}
case OpCode::STORE_INDEXED: {
    // STORE_INDEXED arrayName, index, value
    // get the array address and size
    uint16_t indexAddr = allocateVar(instruction.arg2);
    uint16_t valAddr = allocateVar(instruction.result);
    uint16_t baseAddr = arrMap[instruction.arg1].first;

    // load value to R4
    code.push_back(0x01);
    code.push_back(0x04); // R4
    code.push_back(valAddr >> 8); // addr high
    code.push_back(valAddr & 0xFF); // addr low
    // load index to R2
    code.push_back(0x01);
    code.push_back(0x02); // R2
    code.push_back(indexAddr >> 8); // addr high
    code.push_back(indexAddr & 0xFF); // addr low
    // Load base address high byte to R0
    code.push_back(0x02);
    code.push_back(0x00); // R0
    code.push_back(baseAddr >> 8); // addr high byte only
    // Load base address low byte to R1  
    code.push_back(0x02);
    code.push_back(0x01); // R1
    code.push_back(baseAddr & 0xFF); // addr low byte
    // STORE_INDEXED uses: R0 (hi), R1 (lo), R2 (offset), R4 (src)
    code.push_back(0x0B);
    break;
}
```

## Testing program


```DSL
let arr[5];
arr[1] = 1;
arr[2] = 2;
arr[4] = 10;
out arr[4];
```

It should return 4, the testing can be easily done by REPL. If verification in cpu simulator level, you can run this section by .runfromCPU \<script\>.dsl


---
layout: post
title: "Learn from MVP: Minimal Instruction Set CPU"
date: 2025-02-28 00:05:00 +0000
categories: computer_science
---

## Introduction

The 6502 CPU program has been a great inspiration for understanding the foundations of computer science. It's fascinating how basic boolean functions and transistors can form such a complex and beautiful system. However, even the 6502 CPU, with its 150+ instructions, can be overwhelming for those trying to understand the fundamental principles of computing.

## The Importance of Minimal Viable Products

When learning complex systems, it's crucial to start with a minimal viable product (MVP) - understanding the most essential components that make a program run. This approach led me to explore foundational theories and historical concepts in computing.

## Turing's Influence

Alan Turing's computational theory provides a perfect starting point. His concept of a universal computing machine demonstrates that any computable problem can be solved using a simple machine with:
- An infinite length tape
- A read/write head
- Basic operations (read, write, logic, and arithmetic)
- Position control

While we can't implement an infinite tape, we can create a system that operates in a loop, simulating this fundamental concept.

## Minimal Instruction Set Design

Based on these principles, a minimal CPU needs only four types of instructions:
1. **JMP** (Jump) - For program flow control
2. **Logic** - For basic boolean operations
3. **ADD/SUB** - For arithmetic operations (multiplication and division can be simulated)
4. **HALT** - To stop program execution

## CPU Specification

After careful consideration and consultation, here's the design for our minimal CPU:

![Turing Machine Diagram](/assets/images/turing-machine.png)
*Figure 1: A simplified representation of a Turing Machine*

### Memory and Registers
- **RAM**: 64KB (65536 bytes) with 16-bit addressing
- **Registers**: 4 general-purpose 8-bit registers (R0-R3)
- **Program Counter (PC)**: 16-bit register for instruction fetching

### Instruction Set
| Opcode | Instruction | Description |
|--------|-------------|-------------|
| 0x00   | HALT        | Stops program execution |
| 0x01   | LOAD        | Loads data from memory into register |
| 0x02   | STORE       | Stores register value into memory |
| 0x03   | ADD         | Adds two register values |
| 0x04   | SUB         | Subtracts two register values |
| 0x05   | JNZ         | Jump if register is not zero |

### CPU Operation Cycle
The CPU follows a simple fetch-execute cycle:
1. Fetch instruction from memory at PC
2. Decode instruction
3. Execute instruction
4. Update PC
5. Repeat until HALT

This minimal setup provides the foundation for basic logic and arithmetic operations, which can be extended to handle more complex tasks.

## Implementation

### CPU Header (cpu.h)
```cpp
#pragma once
#include <iostream>
#include <vector>
#include <cstdint>
#include <iomanip>

class MinimalCPU {
public:
    uint8_t RAM[65536]{};
    uint8_t R[4] = {0};  // R0 ~ R3
    uint16_t PC = 0;
    bool halted = false;

    // Load program into memory
    void loadProgram(const std::vector<uint8_t>& program, uint16_t start = 0) {
        for (size_t i = 0; i < program.size(); ++i) {
            RAM[start + i] = program[i];
        }
        PC = start;
    }

    // Main CPU execution loop
    void run() {
        while (!halted) {
            uint8_t op = fetch();
            switch (op) {
                case 0x00: // HALT
                    halted = true;
                    break;
                case 0x01: { // LOAD Rd, addr
                    uint8_t rd = fetch();
                    uint16_t addr = (fetch() << 8) | fetch();
                    R[rd] = RAM[addr];
                    break;
                }
                case 0x02: { // STORE addr, Rs
                    uint16_t addr = (fetch() << 8) | fetch();
                    uint8_t rs = fetch();
                    RAM[addr] = R[rs];

                    // Special handling for output port
                    if (addr == 0xFF00) {
                        std::cout << "OUTPUT: " << static_cast<char>(RAM[addr]) << "\n";
                    }
                    break;
                }
                case 0x03: { // ADD Rd, Rs
                    uint8_t rd = fetch();
                    uint8_t rs = fetch();
                    R[rd] += R[rs];
                    break;
                }
                case 0x04: { // SUB Rd, Rs
                    uint8_t rd = fetch();
                    uint8_t rs = fetch();
                    R[rd] -= R[rs];
                    break;
                }
                case 0x05: { // JNZ Rd, addr
                    uint8_t rd = fetch();
                    uint16_t addr = (fetch() << 8) | fetch();
                    if (R[rd] != 0) {
                        PC = addr;
                    }
                    break;
                }
                default:
                    std::cerr << "Unknown opcode: " << std::hex << static_cast<int>(op) << "\n";
                    halted = true;
                    break;
            }
        }
    }

private:
    uint8_t fetch() {
        return RAM[PC++];
    }
};
```

### Test Program (main.cpp)
```cpp
#include "cpu.h"
#include <iostream>

int main() {
    MinimalCPU cpu;

    // Test program: Load 'A' from memory and output it
    std::vector<uint8_t> program = {
        0x01, 0x00, 0x00, 0xFA,   // LOAD R0, 0x00FA
        0x02, 0xFF, 0x00, 0x00,   // STORE 0xFF00, R0
        0x00                      // HALT
    };

    cpu.RAM[0x00FA] = 'A';  // Set test data
    cpu.loadProgram(program);
    cpu.run();
    
    return 0;
}
```

## Conclusion

This minimal CPU implementation demonstrates the fundamental principles of computing while remaining accessible and understandable. It provides a foundation that can be extended to create more complex systems, making it an excellent learning tool for understanding computer architecture.
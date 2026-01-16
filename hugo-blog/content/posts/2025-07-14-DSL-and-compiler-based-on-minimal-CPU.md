---
layout: post
title: "DSL and Compiler Based on Minimal CPU"
date: 2025-07-14 00:06:00 +0000
categories: computer_science
---

The project is hosted in the repository (section-2):
[minimal_CPU](https://github.com/xichen1997/minimal_turing_complete_CPU)

## Introduction 

After implementing our minimal CPU, we can write machine code or assembly code to run programs. However, these low-level languages are not easy to read or maintain. We need a way to construct a high-level language that can be translated to machine code, making program development more accessible.

Thus, the purpose of this section is to design a Domain-Specific Language (DSL) and its compiler with a complete build system.

## Compiler Architecture: From High-Level Language to Machine Code

Modern language design requires three core components: language design, Intermediate Representation (IR), and utilities for parsing and code generation.

The IR is crucial because it provides an abstraction layer between the high-level language and machine code, making compiler implementation more manageable.

The complete compilation workflow is:

```
DSL → IR → Machine Code
```

From `DSL → IR`, we need a lexer and parser. A code generator then translates `IR → Machine Code`.

In the DSL and IR, we don't need to handle specific memory addresses or CPU registers directly. Instead, we use symbols to represent values (constants or variables). However, when translating `IR → Machine Code`, we must map each symbol to its actual RAM location. For example, a variable called 'a' might be assigned to address 0x8000, so all references to 'a' in the IR will be translated to that memory location.

For example:
```
// IR: store value of b into a
// b is at 0x8001, a is at 0x8000
STORE{ a, b }
```

This translates to machine code/assembly:

```
LOAD R0, 80, 01  // Load value from b into R0 (register 0)
STORE R0, 80, 00  // Store value from R0 into a
```

The IR provides abstraction, so we only need to focus on the IR-to-machine-code translation. If we change the high-level language design, we don't need to worry about extensive changes in the `IR → Machine Code` layer—we just need to add new mappings.

In our compilation system, to separate data variables from code, we set PC = 0 by default and the DATA section starts from 0x8000.

## DSL Features

Our Domain-Specific Language includes the following features:

- **Variable Declaration**: `let variable = value;`
- **Conditional Logic**: `if variable1 <= variable2 goto label;`
- **Labels**: `label_name:`
- **Unconditional Jumps**: `goto label;`
- **Output**: `out variable;`
- **Program Termination**: `halt;`

Example of a DSL snippet:

```dsl
let a = 10;
let b = 20;
if a <= b goto end;
label end;
halt;
```

## CPU Instructions and Architecture Refinements

| Opcode | Mnemonic | Description | Format |
|--------|----------|-------------|---------|
| 0x00 | HALT | Stop program execution | HALT |
| 0x01 | LOAD | Load from memory to register | LOAD Rd, addr |
| 0x02 | LOAD_CONST | Load constant to register | LOAD Rd, const |
| 0x03 | STORE | Store register to memory | STORE addr, Rs |
| 0x04 | STORE_CONST | Store constant to memory | STORE addr, const |
| 0x05 | ADD | Add two registers | ADD Rd, Rs |
| 0x06 | SUB | Subtract two registers | SUB Rd, Rs |
| 0x07 | JNZ | Jump if register not zero | JNZ Rd, addr |
| 0x08 | JZ | Jump if register zero | JZ Rd, addr |

### Key Architectural Features

- **Carry Register**: R2 serves as a carry flag for comparisons
  - Automatically set by the SUB instruction
  - R2 = 1 if underflow occurred (Rd < Rs)
  - R2 = 0 if no underflow (Rd >= Rs)
  - Enables efficient comparison operations

- **Comparison Logic**: SUB sets R2=1 if underflow (Rd < Rs), R2=0 otherwise
  - Eliminates the need for a separate comparison instruction
  - Enables complex conditional logic with minimal instructions
  - Supports all comparison operators through arithmetic operations

- **Conditional Jumps**: JZ/JNZ use R3 for comparison results
  - JZ R3, addr: Jump if R3 == 0 (meaning Rd >= Rs)
  - JNZ R3, addr: Jump if R3 != 0 (meaning Rd < Rs)
  - Enables if-then-else constructs and loops
  - Setting R3=1 as a constant turns JZ/JNZ into JMP

## IR Design

The IR resembles the instruction set because we want easy translation from IR to machine code. The opcode includes special operations like IFLEQ to abstract if-conditions and jumps, along with LABEL and GOTO for control flow.

```c++
enum class OpCode {
    LOAD_CONST, LOAD_VAR,
    ADD, SUB,
    STORE, STORE_CONST, IFLEQ, GOTO,
    LABEL, OUT, HALT
};

struct IR {
    OpCode op;                    // Operation code
    std::string arg1, arg2, result; // arg1: variable name, arg2: constant value, result: temporary variable name
};
```

## IR to Machine Code Translation

The IR generation logic can be found in the [codegen.cpp file](https://github.com/xichen1997/minimal_turing_complete_CPU/blob/main/section-2-DSL-compiler/src/codegen.cpp#L56).

An important consideration is that we need to scan twice for LABELs because label definitions may appear before we know their actual locations in the code section.

We use a backpatching method: we place a placeholder when a LABEL appears, and after completing the compilation loop, we look for these LABEL placeholders and fill in the correct locations.

For the implementation details, please refer to the [code](https://github.com/xichen1997/minimal_turing_complete_CPU/blob/main/section-2-DSL-compiler/src/codegen.cpp#L233).

## Compiler System Implementation

### Lexer
Tokenizes the input DSL program into a stream of tokens (keywords, identifiers, numbers, operators, etc.).

Please refer to the [lexer.cpp code](https://github.com/xichen1997/minimal_turing_complete_CPU/blob/main/section-2-DSL-compiler/src/lexer.cpp). It defines the tokens for translating text to tokens and checking for errors. All token definitions are in [token.h](https://github.com/xichen1997/minimal_turing_complete_CPU/blob/main/section-2-DSL-compiler/include/token.h).

### Parser
Consumes the token stream and builds an intermediate representation (IR) of the program, suitable for execution or further compilation. We use linear scanning and memory write-back methods to keep generation simple, though this generates more code.

For example:
```
let a = 1 + 2 + 3;
```

Will be parsed into:
```
1 → __temp__0
2 → __temp__1
__temp__0 + __temp__1 → __temp__2
3 → __temp__3
__temp__2 + __temp__3 → __temp__4
__temp__4 → a
```

For parsing expressions, we store every constant as a variable in the data section. This might waste some memory but keeps the implementation simple.

For the complete parser implementation, please refer to [parser.cpp](https://github.com/xichen1997/minimal_turing_complete_CPU/blob/main/section-2-DSL-compiler/src/parser.cpp).

### Intermediate Representation (IR)
The IR is a vector of instructions, each corresponding to a CPU operation (e.g., `LOAD_CONST`, `ADD`, `STORE`, `IFLEQ`, `GOTO`, `LABEL`, `OUT`, `HALT`).

Please refer to [codegen.cpp](https://github.com/xichen1997/minimal_turing_complete_CPU/blob/main/section-2-DSL-compiler/src/codegen.cpp) for the implementation.

## Testing the Compiler

Please refer to the documentation in the GitHub repository: [docs](https://github.com/xichen1997/minimal_turing_complete_CPU/blob/main/section-2-DSL-compiler/README.md). Clone the repository and navigate to section-2. You can use `make` to build the compiler and try different DSL programs. The documentation also includes examples showing the complete pipeline from code → IR → machine code.

  


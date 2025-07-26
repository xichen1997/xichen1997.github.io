---
layout: post
title: "Learn from MVP: Minimal Instruction Set CPU"
date: 2025-05-30 00:05:00 +0000
categories: computer_science
---

The project is hosted in the repo(section-2):
[minimal_CPU](https://github.com/xichen1997/minimal_turing_complete_CPU)

## Introduction 

After we already have the minimal CPU, we can write machine code or assemble code to run some program. But they are not easy to recognize or maintain, so we need to have a way to construct high-level language which can be translated to the machine code to help us write program easier.

Thus, the purpose of this section is to design a language(DSL) and the compiler with build harness.


## What do we need for compile the high-level language to machine code

Modern language design require three parts: language design, IR, and untilties to explain and generation them.

The IR is important because it allow us to abstract between real machine code and high-level language. Which allow us to implement the compiler easier. 

The whole generation workflow is:

```
DSL -> IR -> machine code
```
From `DSL -> IR`, a lexer and parser are needed. And a parser will be used to translate `IR->machine code`

In the DSL and IR, we don't need to handle the specific address location in the RAM and CPU register, we only use `symbol` to represent a value(constant or variable). But when refer to the `IR->machine code`, we need to understand transfer each of the symbol to the RAM location value, e.g. a varaible called 'a' will be assigned in the 0x8000, then in the IR all a will be translated to the value in the 0x8000. 

For example:
```
// IR, store b value to a 
// b is in 0x8001, a is in 0x8000
STORE{ a , b }
```
will be translated to machine code/assemble:

```
LOAD R0, 80, 01 // put the value from b to R0(register 0)
STORE R0, 80, 80 // put the value from R0 to a
```

The IR give us an abstraction so we only need to focus on IR to machine code, if we change the high-level language design, we don't need to worry about chaning too much in the `IR->machine` code layer or just need to add a new mapping.

In our compilation, in order to seperate the data vairable and the code text itself, we need to set PC = 0 by default and DATA section starts from 0x8000.






### DSL Features
- **Variable Declaration**: `let variable = value;`
- **Conditional Logic**: `if variable1 <= variable2 goto label;`
- **Labels**: `label_name:`
- **Unconditional Jumps**: `goto label;`
- **Output**: `out variable;`
- **Program Termination**: `halt;`

example of a DSL snippet.

```dsl
let a = 10;
let b = 20;
if a <= b goto end;
label end;
halt;
```


### CPU Instructions and Architecture fine-tuning

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


- **Carry Register**: R2 serves as carry flag for comparisons
  - Automatically set by SUB instruction
  - R2 = 1 if underflow occurred (Rd < Rs)
  - R2 = 0 if no underflow (Rd >= Rs)
  - Enables efficient comparison operations

- **Comparison Logic**: SUB sets R2=1 if underflow (Rd < Rs), R2=0 otherwise
  - Eliminates need for separate comparison instruction
  - Enables complex conditional logic with minimal instructions
  - Supports all comparison operators through arithmetic operations

- **Conditional Jumps**: JZ/JNZ use R3 for comparison results
  - JZ R3, addr: Jump if R3 == 0 (meaning Rd >= Rs)
  - JNZ R3, addr: Jump if R3 != 0 (meaning Rd < Rs)
  - Enables if-then-else constructs and loops
  - Make R3=1 as constant for turn JZ/JNZ as JMP.

### IR design

The IR looks similar to the instruction because we want the IR could be translated to instruction very easy, the opcode also includes the special IFLEQ to abstract the if-condition and jump. Besides, the LABEL, GOTO will also works for jump.

```c++
enum class OpCode{
    LOAD_CONST, LOAD_VAR,
    ADD, SUB,
    STORE, STORE_CONST, IFLEQ, GOTO,
    LABEL, OUT, HALT
};

struct IR{
    OpCode op; // operation code
    std::string arg1, arg2, result; // arg1: variable name, arg2: constant value, result: temporary variable name
};
```

### IR to machine code(codegen.cpp)

IR generation logic: [please cehck the codegen.cpp file](https://github.com/xichen1997/minimal_turing_complete_CPU/blob/main/section-2-DSL-compiler/src/codegen.cpp#L56)

Need to notice we need to scan twice for the LABEL, because the LABEL definition may be show up before we really know it's location, it will point to a location in the code section. 

We use backpatching method, we put a placeholder when a LABEL show up and after we finish the compilation loop, we looks for these LABEL place holder and fill the right location.

Please refer to the [code](https://github.com/xichen1997/minimal_turing_complete_CPU/blob/main/section-2-DSL-compiler/src/codegen.cpp#L233)

## Implementation for compiler system


- **Lexer**:  
  Tokenizes the input DSL program into a stream of tokens (keywords, identifiers, numbers, operators, etc.).

Please refer to the [code](https://github.com/xichen1997/minimal_turing_complete_CPU/blob/main/section-2-DSL-compiler/src/lexer.cpp), it defines the tokens here for translate txt to the tokens and check the errors, all the tokens definition in the [token.h](https://github.com/xichen1997/minimal_turing_complete_CPU/blob/main/section-2-DSL-compiler/include/token.h)



- **Parser**:  
  Consumes the token stream and builds an intermediate representation (IR) of the program, suitable for execution or further compilation. Use linear scanning and memory write back method to keep the generation simpler, but will generate more code:

  For example:
  ```
  let a = 1 + 2 + 3;
  ```
  will be parsed into:
  ```
  1 -> __temp__0
  2 -> __temp__1
  __temp__0 + __temp__1 -> __temp__2
  3 -> __temp__3
  __temp__2 + __temp__3 -> temp__4
  __temp__4 -> a
  ```

  For parse the expression, we try to put every constant into a variable in the data section. This might waste some memory but it's simple. 

  For the whole parser, please refer to the [parser.cpp](https://github.com/xichen1997/minimal_turing_complete_CPU/blob/main/section-2-DSL-compiler/src/parser.cpp)


  - **Intermediate Representation (IR)**:  
  The IR is a vector of instructions, each corresponding to a CPU operation (e.g., `LOAD_CONST`, `ADD`, `STORE`, `IFLEQ`, `GOTO`, `LABEL`, `OUT`, `HALT`).
  
  Please refer to the [codegen.cpp](https://github.com/xichen1997/minimal_turing_complete_CPU/blob/main/section-2-DSL-compiler/src/codegen.cpp)


  ## Test the compiler 

  Please refer to the document in the github: [docs](https://github.com/xichen1997/minimal_turing_complete_CPU/blob/main/section-2-DSL-compiler/README.md), clone the repo and go to section-2. You can use make to build a compiler and try different DSL. There is also an example of the code->IR->machine code in the docs.

  


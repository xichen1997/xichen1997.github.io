---
layout: default
title: "An interesting flipping coin question"
date: 2024-10-26 00:05:00 +0000
categories: computer_science math 
comments: true
---


# An interesting flipping coin question

## Problem statement

You have a fair coin, which means a flip result could be tail(T) and head(H), and their probability is 50%.

You cast the coin until the coin until have a pattern "THTHT" or "THHHT", which one is easier to get? And their probability?


## First thought


Lots of people will think they are identical intuitivly because "T" and "H" both have same probability to get. Then their probability is $\frac{1}{2}^5$. 

But then this idea will disappear because of the method above is to extra 5-times result from an infinite sequence, but the statement is to construct a sequence to see which pattern we can get.

## Markov chain

We can use different state to represent the status for each step:
```
Each toss has an equal probability (0.5) of being Heads (H) or Tails (T). Based on this, we define the transitions between states:

From State 0:

On H: Move to State H (probability 0.5).
On T: Remain in State 0 (probability 0.5).
From State H:

On H: Remain in State H (probability 0.5).
On T: Move to State HT (probability 0.5).
From State HT:

On H: Move to State HTH (probability 0.5).
On T: Move to State HTT (probability 0.5).
From State HTH:

On H: Move to State H (probability 0.5).
On T: Move to State HTHT (probability 0.5).
From State HTHT:

On H: Move to State A (sequence HTHTH achieved) (probability 0.5).
On T: Move to State HTT (probability 0.5).
From State HTT:

On H: Move to State H (probability 0.5).
On T: Move to State HTTT (probability 0.5).
From State HTTT:

On H: Move to State B (sequence HTTTH achieved) (probability 0.5).
On T: Move to State 0 (probability 0.5).
States A and B are absorbing; once entered, the process stops.
```

The markov chain graph looks like:
![img](https://raw.githubusercontent.com/xichen1997/picture_for_blog/master/output.png)


Intuitivly, we can see the path to HTHTH, at state "HTHT", it could transfer to "HTT", which belongs to B state. Then we could say it's more likely to get B rather than A.


## Final calculation

We assume the probability reaching A is u. Then:

Based on the transitions, we create equations for u_i:

1. From State 0: $u_0 = 0.5 \times u_H + 0.5 \times u_0$ Simplifies to: $u_0 = u_H$
2. From State H: $u_H = 0.5 \times u_H + 0.5 \times u_{HT}$ Simplifies to: $u_H = u_{HT}$
3. From State HT: $u_{HT} = 0.5 \times u_{HT} + 0.5 \times u_{HTT}$
4. From State HTH: $u_{HTH} = 0.5 \times u_H + 0.5 \times u_{HTT}$
5. From State HTHT: $u_{HTHT} = 0.5 \times 1 + 0.5 \times u_{HTTT}$ (Since reaching State A has a probability of 1)
6. From State HTT: $u_{HTT} = 0.5 \times u_H + 0.5 \times u_{HTTT}$
7. From State HTTT: $u_{HTTT} = 0.5 \times 0 + 0.5 \times u_0$ (Since reaching State B has a probability of 0 for reaching A)


Then the probability before reaching before B is $\frac{4}{9}$ And the probability to get A is $1-\frac{4}{9} = \frac{5}{9}$

Then A is more easy to get.

# BFEN - Binary Forsyth–Edwards Notation

This is a compressed binary encoding format for Forsyth–Edwards Notation (FEN), with an
implementation library written in TypeScript.
FEN is a notation for encoding board positions of a chess game while containing enough information
to resume a game from any given position.
FEN is a human readable notation which can be further compressed to reduce the total number of
bytes needed to encode a position by up to nearly 70%.

An FEN encoded position contains six fields - the board layout, the active color, castling
availability, en passant target squares, the number of moves since the last capture, and the total
number of full moves.
Often times only the board layout and active color will be excluded, particularly in positions
where castling and en passant is obviously not possible.

For further details about FEN notation check out the wikipedia article
[here.](https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation)

The bit packing tools were partially sourced from Low Byte Productions at https://www.youtube.com/watch?v=132wDVovzhw

## Use cases
The lichess.org puzzle database (found [here](https://database.lichess.org#puzzles))
stores over 3 million plain text FEN positions, which could easily be compacted down using `bfen`.
Similarly, positions from decoded endgame tablebases may want to be stored, which can easily take
up multiple terabytes of data.

Otherwise, a very similar encoding processes can be applied to PGN databases which store entire
chess games. The monthly lichess.org games database found [here](https://database.lichess.org)
typically takes up at least 20 gigabytes of data by storing plain text PGN.
These can also easily be reduced by following a similar encoding processes.
This is different from using a compression algorithm like `gzip` because the database layout is
still stored in a readable format and does not need to be decompressed in it's entity to read
game information.

## The Encoding Process
The encoding process is done by first making trivial reductions in space usage in the standard FEN
notation followed by using bit packing to combine each individual byte.

The standard FEN notation for the starting position takes up 56 bytes and is encoded as follows:
    ```
rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
    ```

It could immediately be compacted down to 46 bytes by removing delimiters:
    ```
rnbqkbnrpppppppp8888PPPPPPPPRNBQKBNRwKQkq-0 1
    ```

You can then further compact it to 31 bytes by using a number to indicate repeated pieces and
using a separate character to indicate empty squares, in this case `e`.
    ```
rnbqkbnr8p32e8PRNBQKBNRwKQkq-0 1
    ```

En passant is typically encoded using coordinate notation (ie `e4`), but if you instead use digits
to encode the en passant square (0 for a4), you only need at most 30 unique characters to
encode the entire position.
This means you need at most 5 bits or less per data point instead of the typical 8 bit ascii
value with the exception of a handful of fields.
Bit packing is then used to compact each 5 bit byte into a sequence of 8 bit bytes.

1. The board position is first encoded by using 5 bit data points. Digits are used for indicating
   repeated values, lower case letters are used to indicate black pieces, and upper case for white
   pieces, where (p = pawn, n = knight, b = bishop, r = rook, q = queen, and k = king). 0 - 9 are
   represented by their corresponding binary values (0 = 00000, 1 = 00001, 9 = 01001, etc).

Symbol | Byte format
---|---
e | 01010
p | 01011
n | 01100
b | 01101
r | 01110
q | 01111
k | 10000
P | 10001
N | 10010
B | 10011
R | 10100
Q | 10101
K | 10110

2. For the active color, only 1 bit is needed: `0` for white-to-move and `1` for black-to-move.

3. There are 16 possible castling availability combinations, which means this can be encoded using
   4 bits. Given that there are four castling availability options, `K`, `Q`, `k`, and `q`,
   we can use 4 bits to represent the castling availability status.
   For example, `KQkq` maps to `1111`, `K` to `1000`, `kq` to `0011`, `Qq` to `0101`, etc.

4. Additionally, there are only 16 squares where en passant can occur,
   so it will at most only require 5 bits to designate the en passant target square, with one extra
   bit needed to designate no en passant. Columns are designated with 3 bits, 1 through 8, while the
   row (either 4 or 5) is designated with a prefix of 0 or 1
   (`a4` = `00000`, `b4` = `00001`, `a5` = `01001`, `-` = `10000`, etc).

5. The halfmove clock is used to indicate the number of half moves since the last capture or pawn
   advancement used in the 50 move rule. This is represented with a 6 bit integer between 0 and 50.

6. The fullmove number indicates the current move. This is an unsigned integer of at most 13 bits,
   given that the maximum number of possible moves in a chess game is just under 6000, stored in
   0 to 2 bytes of variable length. This field can also be excluded entirely given that it's the
   last field.

## Examples
### The Starting Position
Using this methodology, we can then encode the starting position as follows:

```
r 01110 -- Black pieces
n 01100
b 01101
q 01111
k 10000
b 01101
n 01100
r 01110
8 01000 -- Black pawns
p 01011

3 00011
2 00010
e 01010

8 01000 -- White pawns
P 10001
R 10100 -- White pieces
N 10010
B 10011
R 10100
Q 10101
K 10110
B 10011
N 10010
R 10100
0       -- Active color
1111    -- Castling availability
00000    -- En Passant target squares
000000  -- Half moves
1       -- Move number
```

Next, the fields are combined via bit packing and encoded as the following base 10 values:
```
115,  26, 248,  53, 142,  66, 198,  37, 34,  52, 148, 235, 105, 202, 143, 128, 16
```

This reduces the total number of bytes down to 17, or a decrease in size of 69.64%.

### A Maximal Assortment of Pieces
Consider a board of alternating empty squares and queens, with each side having one king.
In normal FEN notation the board position would look like this:
   ```
q1qkq1q1/1q1q1q1q/q1q1q1q1/1q1q1q1q/Q1Q1Q1Q1/1Q1Q1Q1Q/Q1Q1Q1Q1/1Q1QKQ1Q
   ```

This takes 71 bytes, or 64 without the row delimiters.
This can be reduced down to 40 bytes by using bit packing.

```
01111010 10011111 00000111 10101001 11101010
01010011 11010100 11110101 00111101 01001111
01111010 10011110 10100111 10101001 11101010
01010011 11010100 11110101 00111101 01001111
10101010 10101010 10101010 10101010 10101010
01010101 01010101 01010101 01010101 01010101
10101010 10101010 10101010 10101010 10101010
01010101 01101101 01010101 01010101 01010101
```

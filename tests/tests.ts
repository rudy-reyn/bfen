// tests/tests.ts
import {
    BitDescriptor, BitPacker
}  from '../src/bit-packer.js'

import {
    PieceType, Piece, Square,
    Empty, FEN, Color, BinaryFEN
} from '../src/bfen.js';

function display(s: string, v: any) {
    console.log(s, '\n', v, '\n')
}

function equatArrs(xs: Uint8Array, ys: Uint8Array): boolean {
    if (xs.length != ys.length) {
        return false;
    }
    let i = 0;
    while (i < xs.length) {
        if (!(xs[i] == ys[i])) {
            return false;
        }
        i++;
    }
    return true;
}

function black(piece: PieceType, numDuplicated: number = 1): Square {
    return new Piece(piece, BLACK, numDuplicated);
}

function white(piece: PieceType, numDuplicated: number = 1): Square {
    return new Piece(piece, WHITE, numDuplicated);
}

const PAWN = PieceType.Pawn;
const KNIGHT = PieceType.Knight;
const BISHOP = PieceType.Bishop;
const ROOK = PieceType.Rook;
const QUEEN = PieceType.Queen;
const KING = PieceType.King;

const WHITE = Color.White;
const BLACK = Color.Black;
const empty: (a: number) => Square = a =>  new Empty(a)

// Example of packing the starting board position.
const startPosition = new FEN([
        black(ROOK), black(KNIGHT), black(BISHOP), black(QUEEN),
        black(KING), black(BISHOP), black(KNIGHT), black(ROOK),
        black(PAWN, 8),
        empty(32),
        white(PAWN, 8),
        white(ROOK), white(KNIGHT), white(BISHOP), white(QUEEN),
        white(KING), white(BISHOP), white(KNIGHT), white(ROOK)
    ], Color.White
);

const expectedStartPosition = BitPacker.pack([
        // black back row
        '01110', '01100', '01101', '01111', '10000', '01101', '01100', '01110',

        '01000', '01011',          // black pawns
        '00011', '00010', '01010', // empty squares
        '01000', '10001',          // white pawns

        // white back row
        '10100', '10010', '10011', '10101', '10110', '10011', '10010', '10100',

        '0',      // to move
        '1111',   // castling
        '10000',  // en passant target square
        '000000', // number of half moves
        '1'       // number of full moves
    ].map(BitDescriptor.fromString)
);

const actualStartPosition = BinaryFEN.fromFEN(startPosition)

display("Start position FEN", startPosition);
display("Expected BinaryFEN", expectedStartPosition)
display("Actual BinaryFEN", actualStartPosition.bfen)
console.log("Passed:", equatArrs(expectedStartPosition, actualStartPosition.bfen))

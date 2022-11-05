// bfen.ts
import { BitPacker, BitDescriptor } from './bit-packer.js';

abstract class Encodable {
    abstract toString(): string;
}

export enum PieceType {
    Pawn = 'p',
    Knight = 'n',
    Bishop = 'b',
    Rook = 'r',
    Queen = 'q',
    King = 'k'
}

export enum Color { White = 0, Black = 1}

export class Piece extends Encodable {
    pieceType: PieceType;
    color: Color = Color.White;
     // The amount of duplicated pieces in a row. This is limited to the size of the board.
    numDuplicated: number = 1;

    constructor(typ, color, numDuplicated = 1) {
        super()
        requireIntInRange(numDuplicated, 1, 64, 'numDuplicated');
        this.pieceType = typ;
        this.color = color;
        this.numDuplicated = numDuplicated;
    }

    toString() {
        /*
            A single black pawn would be encoded as `p`,
            two black rooks would be `bb`, whereas three would be `3b`, and likewise
            uppercase for white pieces.
        */
        let piece: string = this.pieceType;
        if (this.color === Color.White) {
            piece = piece.toUpperCase();
        }
        if (this.numDuplicated <= 1) {
            return piece;
        }
        if (this.numDuplicated === 2) {
            return piece.concat(piece);
        }
        return this.numDuplicated.toString().concat(piece);
    }

    static fromString(s: string): Piece {
        const pieceTypeEncodings = {
            'p': PieceType.Pawn, 'n': PieceType.Knight, 'b': PieceType.Bishop,
            'r': PieceType.Rook, 'q': PieceType.Queen, 'k': PieceType.King
        }

        const piece = pieceTypeEncodings[s.toLowerCase()];

        if (s === s.toUpperCase()) {
            return new Piece(piece, Color.White, 1);
        }
        return new Piece(piece, Color.Black, 1);
    }

    // Slightly shorter constructors for white and black pieces.
    static black(p: PieceType, numDuplicated: number = 1): Piece {
        return new Piece(p, Color.Black, numDuplicated);
    }

    static white(p: PieceType, numDuplicated: number = 1): Piece {
        return new Piece(p, Color.White, numDuplicated);
    }
}

// An empty square on a board
export class Empty extends Encodable {
    numDuplicated: number = 1;

    constructor(numDuplicated) {
        super()
        requireIntInRange(numDuplicated, 1, 64, 'numDuplicated');
        this.numDuplicated = numDuplicated;
    }

    toString() {
        if (this.numDuplicated <= 1) {
            return 'e';
        }
        if (this.numDuplicated === 2) {
            return 'ee';
        }
        return this.numDuplicated.toString().concat('e');
    }
}

export type Square = Piece | Empty;

// Represented with a 6 bit integer
export enum EnPassantSquare {
    a4 = 0, b4 = 1, c4 = 2, d4 = 3,
    e4 = 4, f4 = 5, g4 = 6, h4 = 7,
    a5 = 8, b5 = 9, c5 = 10, d5 = 11,
    e5 = 12, f5 = 13, g5 = 14, h5 = 15,
    none = 16
}

// Maps to `KQkq` = `1111`, `KQ--` = `1100`, `--kq` = `0011`, etc.
export enum CastlingAvailibility {
    KQkq = 15, KQk = 14, KQq = 12, Kkq = 11, Kk = 10, Kq = 9, K = 8,
    Qkq = 7, Qk = 6, Qq = 5, Q = 4,
    kq = 3, k = 2, q = 1, none = 0
}

export class FEN extends Encodable {
    board: Array<Square>;
    toMove: Color;
    castling: CastlingAvailibility = CastlingAvailibility.KQkq;
    enPassantTarget: EnPassantSquare = EnPassantSquare.none;
    // The number of half moves since the last pawn push or capture, used for the 50 move rule.
    halfMoves: number = 0;
    fullMoves: number = 1;

    constructor(board, toMove,
                castling = CastlingAvailibility.KQkq,
                enPassantTarget = EnPassantSquare.none,
                halfMoves = 0,
                fullMoves = 1) {
        // The maximum number of possible chess moves in a game is less than 5949
        requireIntInRange(halfMoves, 0, 50, 'halfMoves');
        requireIntInRange(fullMoves, 1, 5949, 'fullMoves');

        super();
        this.board = board;
        this.toMove = toMove;
        this.castling = castling;
        this.enPassantTarget = enPassantTarget;
        this.halfMoves = halfMoves;
        this.fullMoves = fullMoves;
    }

    toString() {
        return this.board.reduce((acc, x) => acc.concat(x.toString()), '')
    }
}
export class BinaryFEN {
    bfen: Uint8Array;
    constructor(bfen) {
        this.bfen = bfen
    }

    static fromFEN(fen: FEN): BinaryFEN {
        const pieceEncodings = {
            '0': '00000',
            '1': '00001', '2': '00010', '3': '00011',
            '4': '00100', '5': '00101', '6': '00110',
            '7': '00111', '8': '01000', '9': '01001',
            'e': '01010',
            'p': '01011', 'n': '01100', 'b': '01101',
            'r': '01110', 'q': '01111', 'k': '10000',
            'P': '10001', 'N': '10010', 'B': '10011',
            'R': '10100', 'Q': '10101', 'K': '10110'
        }
        const addDescriptor = (n, l) => descriptors.push(new BitDescriptor(n, l))

        let descriptors = [];
        for (const f of fen.toString()) {
            descriptors.push(BitDescriptor.fromString(pieceEncodings[f]));
        }

        addDescriptor(fen.toMove, 1);
        addDescriptor(fen.castling, 4);
        addDescriptor(fen.enPassantTarget, 5);
        addDescriptor(fen.halfMoves, 6);

        requireIntInRange(fen.fullMoves, 1, 5949, 'fullMoves')
        // This is needed to make sure the correct number of bits are packed.
        for (const i of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]) {
            if (fen.fullMoves < 2**i) {
                addDescriptor(fen.fullMoves, i);
                break;
            }
        }
        return new BinaryFEN(BitPacker.pack(descriptors));
    }

    // toBlob(): Blob {
    //     return new Blob([this.bfen], {type: "bfen"})
    // }
}

const requireIntInRange = (n, x, y, s) => {
    if (!Number.isInteger(n) || n < x || n > y) {
        throw new Error(`${s} must be an integer between ${x} and ${y}`)
    }
}

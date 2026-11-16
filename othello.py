# オセロ（リバーシ） - Pygame版
# 使い方: pip install pygame のあと python othello.py
# 起動したらモード選択: 1 = コンピュータ対戦 / 2 = 人対人（同じ画面で交互に操作）
# 操作: マウスでクリックして石を置く / Rキーでリスタート / 1・2キーでモード切替

import random
import pygame

# ---------- 定数 ----------
EMPTY, BLACK, WHITE = 0, 1, 2
SIZE = 8                      # 8x8盤面
CELL = 70                     # 1マスのピクセル数
BOARD_PX = CELL * SIZE        # 盤面の一辺
INFO_H = 60                   # 下部スコア表示エリアの高さ
WIDTH, HEIGHT = BOARD_PX, BOARD_PX + INFO_H

GREEN = (0, 128, 0)
DARK_GREEN = (0, 100, 0)
LINE = (0, 60, 0)
BLACK_RGB = (20, 20, 20)
WHITE_RGB = (245, 245, 245)
HINT = (180, 230, 180)
TEXT = (255, 255, 255)

DIRECTIONS = [(-1, -1), (-1, 0), (-1, 1), (0, -1),
              (0, 1), (1, -1), (1, 0), (1, 1)]

# AIのマス評価（角が最強、角の隣は危険）
WEIGHTS = [
    [100, -20,  10,   5,   5,  10, -20, 100],
    [-20, -40,  -5,  -5,  -5,  -5, -40, -20],
    [ 10,  -5,   8,   1,   1,   8,  -5,  10],
    [  5,  -5,   1,   0,   0,   1,  -5,   5],
    [  5,  -5,   1,   0,   0,   1,  -5,   5],
    [ 10,  -5,   8,   1,   1,   8,  -5,  10],
    [-20, -40,  -5,  -5,  -5,  -5, -40, -20],
    [100, -20,  10,   5,   5,  10, -20, 100],
]


# ---------- 盤面ロジック（描画と分離してあるのでテストしやすい） ----------
def new_board():
    """初期配置の盤面を返す。board[y][x]"""
    board = [[EMPTY] * SIZE for _ in range(SIZE)]
    board[3][3], board[4][4] = WHITE, WHITE
    board[3][4], board[4][3] = BLACK, BLACK
    return board


def opponent(color):
    return WHITE if color == BLACK else BLACK


def flips_for(board, x, y, color):
    """(x, y) に color を置いたとき裏返る石のリスト。置けなければ空リスト"""
    if board[y][x] != EMPTY:
        return []
    opp = opponent(color)
    result = []
    for dx, dy in DIRECTIONS:
        line = []
        cx, cy = x + dx, y + dy
        while 0 <= cx < SIZE and 0 <= cy < SIZE and board[cy][cx] == opp:
            line.append((cx, cy))
            cx += dx
            cy += dy
        # 相手の石の列の先に自分の石があれば、その列を全部裏返せる
        if line and 0 <= cx < SIZE and 0 <= cy < SIZE and board[cy][cx] == color:
            result.extend(line)
    return result


def valid_moves(board, color):
    """置けるマスの dict {(x, y): 裏返る石のリスト}"""
    moves = {}
    for y in range(SIZE):
        for x in range(SIZE):
            f = flips_for(board, x, y, color)
            if f:
                moves[(x, y)] = f
    return moves


def apply_move(board, x, y, color, flips):
    board[y][x] = color
    for fx, fy in flips:
        board[fy][fx] = color


def count(board):
    b = sum(row.count(BLACK) for row in board)
    w = sum(row.count(WHITE) for row in board)
    return b, w


def ai_choose(board, color):
    """重み付き評価＋裏返し枚数で一番良い手を選ぶ"""
    moves = valid_moves(board, color)
    if not moves:
        return None

    def score(item):
        (x, y), flips = item
        return WEIGHTS[y][x] * 10 + len(flips)

    return max(moves.items(), key=score)


# ---------- 描画 ----------
def draw(screen, font, big_font, board, moves, turn, game_over, mode):
    screen.fill(GREEN)
    # モード選択画面
    if mode is None:
        title = big_font.render("OTHELLO", True, TEXT)
        screen.blit(title, (WIDTH // 2 - title.get_width() // 2, 180))
        lines = ["Press 1 : Play vs CPU (you are Black)",
                 "Press 2 : 2 Players (take turns on this screen)"]
        for i, line in enumerate(lines):
            t = font.render(line, True, TEXT)
            screen.blit(t, (WIDTH // 2 - t.get_width() // 2, 280 + i * 40))
        pygame.display.flip()
        return
    # 置けるマスのヒント（人間の手番のときだけ）
    human_turn = mode == "2p" or turn == BLACK
    if human_turn and not game_over:
        for (x, y) in moves:
            pygame.draw.circle(screen, HINT,
                               (x * CELL + CELL // 2, y * CELL + CELL // 2), 8)
    # グリッドと石
    for y in range(SIZE):
        for x in range(SIZE):
            pygame.draw.rect(screen, LINE,
                             (x * CELL, y * CELL, CELL, CELL), 1)
            v = board[y][x]
            if v != EMPTY:
                color = BLACK_RGB if v == BLACK else WHITE_RGB
                pygame.draw.circle(screen, color,
                                   (x * CELL + CELL // 2, y * CELL + CELL // 2),
                                   CELL // 2 - 6)
    # スコアと状態
    pygame.draw.rect(screen, DARK_GREEN, (0, BOARD_PX, WIDTH, INFO_H))
    b, w = count(board)
    if game_over:
        if b > w:
            winner = "Black wins!" if mode == "2p" else "You win!"
        elif w > b:
            winner = "White wins!" if mode == "2p" else "CPU wins"
        else:
            winner = "Draw"
        msg = f"Game Over  Black {b} - {w} White  {winner}  (R: restart)"
    elif mode == "2p":
        whose = "Black" if turn == BLACK else "White"
        msg = f"Black {b}  -  {w} White   {whose}'s turn  (1/2: mode, R: restart)"
    elif turn == BLACK:
        msg = f"Black (You) {b}  -  {w} White (CPU)   Your turn"
    else:
        msg = f"Black (You) {b}  -  {w} White (CPU)   CPU thinking..."
    text = font.render(msg, True, TEXT)
    screen.blit(text, (12, BOARD_PX + 18))
    pygame.display.flip()


# ---------- メイン ----------
def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Othello - Pygame")
    font = pygame.font.SysFont(None, 28)
    big_font = pygame.font.SysFont(None, 64)
    clock = pygame.time.Clock()

    board = new_board()
    turn = BLACK
    game_over = False
    mode = None  # None=選択画面 / "cpu"=対CPU / "2p"=人対人
    cpu_timer = 0  # CPUの手を少し遅らせて見せるためのカウンタ

    def reset(new_mode):
        nonlocal board, turn, game_over, cpu_timer
        board = new_board()
        turn = BLACK
        game_over = False
        cpu_timer = 0
        return new_mode

    running = True
    while running:
        moves = valid_moves(board, turn)

        # 両者とも置けなければ終了、片方だけ置けなければパス
        if mode is not None:
            if not moves and not valid_moves(board, opponent(turn)):
                game_over = True
            elif not moves:
                turn = opponent(turn)
                moves = valid_moves(board, turn)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_1:
                    mode = reset("cpu")
                elif event.key == pygame.K_2:
                    mode = reset("2p")
                elif event.key == pygame.K_r and mode is not None:
                    mode = reset(mode)
            elif (event.type == pygame.MOUSEBUTTONDOWN and mode is not None
                  and not game_over
                  and (mode == "2p" or turn == BLACK)):
                mx, my = event.pos
                if my < BOARD_PX:
                    x, y = mx // CELL, my // CELL
                    if (x, y) in moves:
                        apply_move(board, x, y, turn, moves[(x, y)])
                        turn = opponent(turn)
                        cpu_timer = 0

        # CPUの手番（少し間を置いてから置く）
        if mode == "cpu" and turn == WHITE and not game_over:
            cpu_timer += 1
            if cpu_timer > 30:  # 約0.5秒
                choice = ai_choose(board, WHITE)
                if choice:
                    (x, y), flips = choice
                    apply_move(board, x, y, WHITE, flips)
                turn = BLACK
                cpu_timer = 0

        draw(screen, font, big_font, board, valid_moves(board, turn),
             turn, game_over, mode)
        clock.tick(60)

    pygame.quit()


if __name__ == "__main__":
    main()

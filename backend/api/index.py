# Vercel Serverless Functions 用エントリポイント
# プロジェクトルート（backend/）を path に追加して main.app を読み込む
import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

from main import app
from mangum import Mangum

handler = Mangum(app, lifespan="off")

"""兼容旧命令；当前只分离独立绘制的镜头，禁止一图多裁复用。"""
from pathlib import Path
import subprocess, sys
subprocess.run([sys.executable,str(Path(__file__).with_name('install-independent-shots.py'))],check=True)

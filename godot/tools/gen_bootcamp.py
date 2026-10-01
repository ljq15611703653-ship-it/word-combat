# -*- coding: utf-8 -*-
# 生成 data/bootcamp.json：python tools/gen_bootcamp.py
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import bootcamp_dsl as D
import importlib
for m in ["bootcamp_ch1", "bootcamp_ch2", "bootcamp_ch3", "bootcamp_ch4", "bootcamp_ch5", "bootcamp_ch6", "bootcamp_ch7"]:
    try:
        importlib.import_module(m)
    except ModuleNotFoundError as e:
        if m not in str(e):
            raise
D.LEVELS.sort(key=lambda l: l["id"])
D.write(os.path.join(os.path.dirname(__file__), "..", "data", "bootcamp.json"))

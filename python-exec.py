#!/usr/bin/env python3
import sys
import json

try:
    code = sys.argv[1] if len(sys.argv) > 1 else sys.stdin.read()
    
    # 导入常用库
    import pyautogui
    import time
    import os
    
    # 执行代码
    result = eval(code) if not '\n' in code else exec(code)
    
    print(json.dumps({"success": True, "result": str(result)}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))

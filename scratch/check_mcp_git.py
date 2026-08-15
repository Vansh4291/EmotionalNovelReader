import sys
import mcp
from mcp.server import Server
from mcp.server.lowlevel import Server as LowLevelServer

print("mcp version:", getattr(mcp, "__version__", "unknown"))
print("Server dir:", [x for x in dir(Server) if "tool" in x.lower() or "list" in x.lower()])
print("LowLevelServer dir:", [x for x in dir(LowLevelServer) if "tool" in x.lower() or "list" in x.lower()])

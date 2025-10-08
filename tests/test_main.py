from io import StringIO
from unittest.mock import patch

from main import main


def test_main():
    """Test that main prints the expected greeting."""
    with patch("sys.stdout", new=StringIO()) as fake_out:
        main()
        assert fake_out.getvalue() == "Hello from obsidian-mcp!\n"

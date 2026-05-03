import sys
import re


class ConsoleLogger:
    """Handles colored terminal output and tabular displays."""
    RESET = "\033[0m"
    BOLD = "\033[1m"
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    MAGENTA = "\033[95m"

    @classmethod
    def success(cls, message: str) -> str:
        return f"{cls.GREEN}{message}{cls.RESET}"

    @classmethod
    def info(cls, message: str) -> str:
        return f"{cls.CYAN}{message}{cls.RESET}"

    @classmethod
    def warning(cls, message: str) -> str:
        return f"{cls.YELLOW}{message}{cls.RESET}"

    @classmethod
    def error(cls, message: str) -> str:
        return f"{cls.RED}{message}{cls.RESET}"

    @classmethod
    def progress_bar(cls, current: int, total: int, prefix: str = "Progress", suffix: str = "", length: int = 40):
        percent = float(current) * 100 / total
        filled = int(length * current // total)
        bar = '█' * filled + '-' * (length - filled)

        # \033[K clears the line from cursor to end to prevent ghosting from previous longer strings
        sys.stdout.write(f"\r\033[K{cls.CYAN}{cls.BOLD}{prefix} |{bar}| {percent:.1f}% {cls.RESET}{suffix}")
        sys.stdout.flush()
        if current == total:
            sys.stdout.write("\n")
            sys.stdout.flush()

    @classmethod
    def print_table(cls, title: str, headers: list[str], rows: list[list[str]]):
        if not rows:
            print(f"{cls.info(title)}: No data to display.")
            return

        # Calculate column widths
        col_widths = [len(h) for h in headers]
        for row in rows:
            for i, cell in enumerate(row):
                # Strip ANSI codes for length calculation
                clean_cell = cls._strip_ansi(str(cell))
                col_widths[i] = max(col_widths[i], len(clean_cell))

        # Print Title
        print(f"\n{cls.BOLD}{cls.MAGENTA}=== {title} ==={cls.RESET}")

        # Print Headers
        header_row = " | ".join(h.ljust(col_widths[i]) for i, h in enumerate(headers))
        print(f"{cls.BOLD}{header_row}{cls.RESET}")
        print("-" * len(header_row))

        # Print Rows
        for row in rows:
            print(" | ".join(str(cell).ljust(col_widths[i] + (len(str(cell)) - len(cls._strip_ansi(str(cell)))))
                             for i, cell in enumerate(row)))
        print()

    @staticmethod
    def _strip_ansi(text: str) -> str:
        return re.sub(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])', '', text)
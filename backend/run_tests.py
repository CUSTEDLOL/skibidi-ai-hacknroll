#!/usr/bin/env python
"""
Simple test runner script for backend tests.
Usage: python run_tests.py [options]
"""
import sys
import subprocess


def run_tests():
    """Run pytest with common options"""
    # Basic test run
    cmd = [sys.executable, '-m', 'pytest']

    # Add command line args if provided
    if len(sys.argv) > 1:
        cmd.extend(sys.argv[1:])
    else:
        # Default: verbose output with short traceback
        cmd.extend(['-v', '--tb=short'])

    print(f"Running: {' '.join(cmd)}")
    print("-" * 60)

    result = subprocess.run(cmd, cwd='.')
    return result.returncode


if __name__ == '__main__':
    sys.exit(run_tests())

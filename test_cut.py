import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from app.services.video_engine import process_silence_cut

def main():
    test_in = "source/vid_test_001/input.mp4"
    test_out = "output/vid_test_001/cut_test.mp4"
    os.makedirs(os.path.dirname(test_out), exist_ok=True)
    try:
        process_silence_cut(test_in, test_out, level=2)
        print("Success!")
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

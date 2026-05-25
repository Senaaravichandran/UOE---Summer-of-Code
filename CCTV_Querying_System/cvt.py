import argparse
import os
import subprocess
import ffmpeg


def convert_frame_rate(input_file, output_file, target_fps):
    """
    Convert a video file to a specified frame rate.
    
    Args:
        input_file (str): Path to the input video file.
        output_file (str): Path to save the output video file.
        target_fps (float): Target frame rate for the output video.
    """
    try:
        # Get the input video information
        probe = ffmpeg.probe(input_file)
        video_stream = next((stream for stream in probe['streams'] 
                            if stream['codec_type'] == 'video'), None)
        
        if video_stream is None:
            raise Exception("No video stream found in the input file.")
        
        # Get the current FPS
        if 'avg_frame_rate' in video_stream:
            fps_parts = video_stream['avg_frame_rate'].split('/')
            current_fps = float(fps_parts[0]) / float(fps_parts[1]) if len(fps_parts) == 2 and float(fps_parts[1]) != 0 else 0
        else:
            current_fps = 0
            
        print(f"Current frame rate: {current_fps} fps")
        print(f"Target frame rate: {target_fps} fps")
        
        # Set up the conversion process
        (
            ffmpeg
            .input(input_file)
            .filter('fps', fps=target_fps)
            .output(output_file, **{'c:v': 'libx264', 'crf': '18', 'preset': 'medium'})
            .overwrite_output()
            .run()
        )
        
        print(f"Conversion completed. Output saved to: {output_file}")
        
    except ffmpeg.Error as e:
        print(f"FFmpeg error: {e.stderr.decode()}")
    except Exception as e:
        print(f"Error: {str(e)}")


def main():
    parser = argparse.ArgumentParser(description='Convert video frame rate.')
    parser.add_argument('input', help='Input video file path')
    parser.add_argument('output', help='Output video file path')
    parser.add_argument('--fps', type=float, required=True, help='Target frame rate')
    
    args = parser.parse_args()
    
    # Check if input file exists
    if not os.path.isfile(args.input):
        print(f"Error: Input file '{args.input}' does not exist.")
        return
    
    # Check if ffmpeg is installed
    try:
        subprocess.run(['ffmpeg', '-version'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    except (subprocess.SubprocessError, FileNotFoundError):
        print("Error: FFmpeg is not installed or not in the system PATH.")
        print("Please install FFmpeg: https://ffmpeg.org/download.html")
        return
    
    convert_frame_rate(args.input, args.output, args.fps)


if __name__ == "__main__":
    main()
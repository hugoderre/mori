from pydub import AudioSegment
import os
import subprocess
import sys
from pathlib import Path
from subprocess import Popen
from datetime import datetime
import re

parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

split_audio_folder = os.path.join(parent_dir, "raw")
processed_audio_folder = os.path.join(parent_dir, "results")

# If not exists, create the folders
Path(split_audio_folder).mkdir(parents=True, exist_ok=True)
Path(processed_audio_folder).mkdir(parents=True, exist_ok=True)

# Remove all files in the folders
for file in os.listdir(split_audio_folder):
	os.remove(os.path.join(split_audio_folder, file))
 
for file in os.listdir(processed_audio_folder):
	os.remove(os.path.join(processed_audio_folder, file))

input_acapella_file_path = os.path.join(parent_dir, "htdemucs\\base_song\\vocals.wav")
output_acapella_file_path = os.path.join(parent_dir, "htdemucs\\base_song\\vocals.out.wav")
output_instrumental_file_path = os.path.join(parent_dir, "htdemucs\\base_song\\no_vocals.wav")
output_full_file_path = os.path.join(parent_dir, "htdemucs\\base_song\\full.wav")

speaker = "mori"
model_path = os.path.join(parent_dir, "models\\G_4000.pth")
config_path = os.path.join(parent_dir, "models\\config.json")

# num_parts = 8
overlap_seconds = 0.125
seconds_per_part = 5

def main():
    timestamp = datetime.now()
    split_audio_file(input_acapella_file_path, split_audio_folder, seconds_per_part, overlap_seconds)
    infer_audio_files(split_audio_folder, processed_audio_folder)
    crossfade_audio_files(processed_audio_folder, output_acapella_file_path, overlap_seconds)
    overlay_instrumental(output_acapella_file_path, output_instrumental_file_path, output_full_file_path)
    duration = datetime.now() - timestamp
    print(f"Elapsed duration: {duration}")

def split_audio_file(input_acapella_file_path, output_folder_path, seconds_per_part, overlap_seconds):
    audio = AudioSegment.from_file(input_acapella_file_path)
    audio_length = len(audio)
    num_parts = (audio_length // (seconds_per_part*1000)) + 1
    part_length = audio_length // num_parts
    overlap_length = overlap_seconds * 1000
    for i in range(num_parts):
        start = i * part_length
        end = start + part_length
        start -= overlap_length
        end += overlap_length
        if i == 0:
            start = 0
        if i == num_parts - 1:
            end = audio_length
        part = audio[start:end]
        part.export(os.path.join(output_folder_path, f"part_{i + 1}.wav"), format="wav")

def infer_audio_files(input_folder_path, output_folder_path):
    input_files = os.listdir(input_folder_path)
    input_files.sort(key=lambda val: int(re.findall(r"(?<=_)[0-9]+(?=\.)", val)[0]))
    args = [
        'svc', 'infer',
        '-s', speaker,
        '-m', model_path,
        '-c', config_path,
        '-o', output_folder_path,
        '-fm', 'crepe',
        '--transpose=0',
        '--no-auto-predict-f0',
        input_folder_path
    ]
    p = subprocess.Popen(args)
    p.wait()

def crossfade_audio_files(input_folder_path, output_acapella_file, overlap_seconds):
    input_files = os.listdir(input_folder_path)
    input_files.sort(key=lambda val: int(re.findall(r"(?<=_)[0-9]+(?=\.)", val)[0]))
    combined_audio = AudioSegment.from_file(os.path.join(input_folder_path, input_files[0]))
    for file_name in input_files[1:]:
        part = AudioSegment.from_file(os.path.join(input_folder_path, file_name))
        combined_audio = combined_audio.append(part, crossfade=overlap_seconds * 2 * 1000)
    combined_audio.export(output_acapella_file, format="wav")
    
def overlay_instrumental(vocal_file, output_instrumental_file_path, output_full_file_path):
    vocal_audio = AudioSegment.from_file(vocal_file)
    instrumental_audio = AudioSegment.from_file(output_instrumental_file_path)
    combined_audio = vocal_audio.overlay(instrumental_audio)
    combined_audio.export(output_full_file_path, format="wav")

if __name__ == '__main__':
    main()
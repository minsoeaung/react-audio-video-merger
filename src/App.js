import './App.sass';
import {useState} from "react";
import {createFFmpeg, fetchFile} from "@ffmpeg/ffmpeg";
import useCounter from "./useCounter";

function App() {
    const [videoInput, setVideoInput] = useState({file: null, src: null});
    const [audioInput, setAudioInput] = useState({file: null, src: null});
    const [isReplaceAudio, setIsReplaceAudio] = useState(false);
    const [outputVideoSrc, setOutputVideoSrc] = useState('');
    const [message, setMessage] = useState('Idle');
    const {count, startCounter, pauseCounter, resetCounter} = useCounter();
    const ffmpeg = createFFmpeg({log: true});

    const reset = () => {
        setOutputVideoSrc(null);
        resetCounter();
    }

    const doTranscode = async () => {
        reset();
        startCounter();

        const outputFileName = 'output.mp4'
        const inputVideoFile = videoInput.file
        const inputAudioFile = audioInput.file

        try {
            setMessage('Loading ffmpeg-core.js');
            await ffmpeg.load();
            setMessage('Loading input files to memory')
            ffmpeg.FS('writeFile', inputVideoFile.name, await fetchFile(inputVideoFile));
            ffmpeg.FS('writeFile', inputAudioFile.name, await fetchFile(inputAudioFile));
            setMessage('Transcoding')
            if (isReplaceAudio) {
                await replaceAudio(ffmpeg, inputVideoFile.name, inputAudioFile.name, outputFileName);
            } else {
                await mixAudio(ffmpeg, inputVideoFile.name, inputAudioFile.name, outputFileName);
            }
            setMessage('Complete transcoding');
            const data = await ffmpeg.FS('readFile', outputFileName);
            setOutputVideoSrc(URL.createObjectURL(new Blob([data.buffer], {type: 'video/mp4'})));
            setMessage('Success. Output is ready')
        } catch (e) {
            reset();
            console.log(e);
            setMessage('Error happened. Check console')
        }
        pauseCounter();
    };

    const handleVideoInputChange = (event) => {
        const file = event.target.files[0];
        setVideoInput({
            file, src: URL.createObjectURL(file)
        });
    }

    const handleAudioInputChange = (event) => {
        const file = event.target.files[0];
        setAudioInput({
            file, src: URL.createObjectURL(file)
        })
    }

    const handleMuteVideoChange = (event) => {
        setIsReplaceAudio(event.target.checked)
    }

    return (
        <div className="App">
            <label htmlFor='video-input'>Video input: </label>
            <input name='video-input' type='file' accept='video/*' onChange={handleVideoInputChange}/>
            <label htmlFor='audio-input'>Audio input: </label>
            <input name='audio-input' type='file' accept='audio/*' onChange={handleAudioInputChange}/>
            <p/>
            <div className='input'>
                <div>
                    <h1>Input Video</h1>
                    <video src={videoInput.src} controls width={400}/>
                </div>
                <div>
                    <h1>Input Audio</h1>
                    <audio src={audioInput.src} controls/>
                </div>
                <div>
                    <h1>Output Video</h1>
                    <video src={outputVideoSrc} controls width={400}/>
                </div>
            </div>
            <br/>
            <label htmlFor='mute-video'>Replace audio</label>
            <input type="checkbox" name="mute-video" onChange={handleMuteVideoChange}/>
            <button onClick={doTranscode}>Start Transcoding</button>
            <p>
                <strong>Status</strong>: {message}
            </p>
            <p>
                <strong>Processing time</strong>: {count} seconds
            </p>
        </div>
    );
}

async function mixAudio(ffmpeg, inputVideoName, inputAudioName, outputName) {
    await ffmpeg.run(
        '-i', inputVideoName,
        '-i', inputAudioName,
        '-filter_complex', // announcing to use complex filter
        '[0:a][1:a]amerge=inputs=2[a]', // merging two audio into one
        '-map', '0:v', // select video stream(v) of the first input(0)
        '-map', '[a]', // select audio stream(a) of the merged audio
        '-c:v', 'copy', // copy, do not re-encode
        '-ac', '2', // audio channel 2
        '-shortest', // stop if one input end
        outputName
    );
}

async function replaceAudio(ffmpeg, inputVideoName, inputAudioName, outputName) {
    await ffmpeg.run(
        '-i', inputVideoName, // video input
        '-i', inputAudioName, // audio input
        '-map', '0:v', // selecting the first video stream of the first file
        '-map', '1:a', // selecting the first audio stream of the second file
        '-c', 'copy', // copies the audio and video streams
        // This means that the process will be fast and the quality will be the same.
        // But when adding, say, WAV audio to an existing video file,
        // it'd be better to compress that audio first. For example:
        // ffmpeg -i input.mp4 -i input.wav -c:v copy -map 0:v:0 -map 1:a:0 -c:a aac -b:a 192k output.mp4
        // Here, we only copy the video stream (-c:v copy),
        // and re-encode the audio stream with the ffmpeg built-in AAC encoder (-c:a aac) at 192 kBit/s.
        '-shortest', // stop the conversion when the shorter of the two ends, put anywhere between -i <input> and the output file
        outputName
    );
}

export default App;

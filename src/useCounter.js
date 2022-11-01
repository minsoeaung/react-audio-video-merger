import {useRef, useState} from "react";

const useCounter = () => {
    const [seconds, setSeconds] = useState(0);
    const timerRef = useRef();

    const startCounter = () => {
        timerRef.current = setInterval(() => {
            setSeconds(prevState => prevState + 1);
        }, 1000);
    }

    const resetCounter = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        setSeconds(0);
    }

    const pauseCounter = () => {
        clearInterval(timerRef.current);
    }

    return {
        count: seconds,
        startCounter,
        resetCounter,
        pauseCounter
    }
}

export default useCounter;

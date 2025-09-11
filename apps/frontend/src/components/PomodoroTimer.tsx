// apps/frontend/src/components/PomodoroTimer.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import apiClient from '../api/axios';
import useAuthStore from '../stores/authStore';

const WORK_DURATION = 5; // 25 minutes in seconds
const BREAK_DURATION = 5; // 5 minutes in seconds

export default function PomodoroTimer() {
  const [timeRemaining, setTimeRemaining] = useState(WORK_DURATION);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const setActiveSessions = useAuthStore((state) => state.setactivesessions);
  // const audioRef = useRef<HTMLAudioElement | null>(null);

  // useEffect(() => {
  //   // Preload the audio
  //   audioRef.current = new Audio('https://www.soundjay.com/buttons/sounds/button-16.mp3');
  // }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prevTime) => prevTime - 1);
      }, 1000);
    } else if (isActive && timeRemaining === 0) {
      // Timer finished
      // audioRef.current?.play();
      logSession();
      setIsActive(false);
      setIsBreak((prevBreak) => !prevBreak);
      setTimeRemaining(isBreak ? WORK_DURATION : BREAK_DURATION);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeRemaining]);

  const logSession = async () => {
    if (isBreak) return; // Don't log break sessions
    try {
      await apiClient.post('/pomodoro/log', {
        start_time: new Date(Date.now() - WORK_DURATION * 1000).toISOString(),
        end_time: new Date().toISOString(),
        duration: Math.ceil(WORK_DURATION / 60),
      });
      console.log("Pomodoro session logged successfully.");
      useAuthStore.setState(state => ({ activesessions: state.activesessions + 1 }));
    } catch (error) {
      console.error("Failed to log Pomodoro session:", error);
    }
  };

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setIsBreak(false);
    setTimeRemaining(WORK_DURATION);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progress = ((isBreak ? BREAK_DURATION : WORK_DURATION) - timeRemaining) / (isBreak ? BREAK_DURATION : WORK_DURATION);

  return (
    <div className="bg-gray-100 p-6 rounded-lg shadow-md mb-8">
      <h3 className="text-sm font-semibold mb-4 text-center">{isBreak ? 'Break Time!' : 'Focus Session'}</h3>
      <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle className="text-gray-700" strokeWidth="7" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" />
          {/* Progress circle */}
          <circle
            className="text-indigo-500"
            strokeWidth="7"
            strokeDasharray={2 * Math.PI * 45}
            strokeDashoffset={(2 * Math.PI * 45) * (1 - progress)}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r="45"
            cx="50"
            cy="50"
            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
          />
        </svg>
        <div className="absolute text-xl font-bold">{formatTime(timeRemaining)}</div>
      </div>
      <div className="flex justify-center gap-4 mt-6">
        <button
          onClick={toggleTimer}
          className={`px-6 py-2 rounded-md font-semibold text-white ${isActive ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}`}
        >
          {isActive ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={resetTimer}
          className="px-6 py-2 rounded-md font-semibold bg-gray-600 hover:bg-gray-500 text-white"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
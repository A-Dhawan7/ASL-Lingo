import React, { useRef, useState, useEffect, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import Webcam from 'react-webcam';

type Props = {
  onClassIdVerified: (classId: number | null) => void;
  onTimerElapsed: (isElapsed: boolean) => void;
}

export const ASLDetection = ({ onClassIdVerified, onTimerElapsed }: Props) => {
  const [model, setModel] = useState<tf.GraphModel | null>(null);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [timeLeft, setTimeLeft] = useState<number>(10);

  const webcamRef = useRef<Webcam | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastDetectedClassId = useRef<number | null>(null);
  const detectionStartTime = useRef<number>(0);
  const timerStartTime = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadModel = async () => {
      const model = await tf.loadGraphModel('https://tfjslingomodel.s3.us-east.cloud-object-storage.appdomain.cloud/model.json');
      setModel(model);
      console.log('Model loaded:', model);
    };
    loadModel();
  }, []);

  const detectSigns = useCallback(async (net: tf.GraphModel) => {
    if (webcamRef.current?.video?.readyState === 4) {
      const video = webcamRef.current.video;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      if (canvasRef.current) {
        canvasRef.current.width = videoWidth;
        canvasRef.current.height = videoHeight;
      }

      const img = tf.browser.fromPixels(video);
      const resized = tf.image.resizeBilinear(img, [320, 320]);
      const casted = resized.cast('int32');
      const tensorInput = casted.expandDims(0);

      const [boxesTensor, classesTensor, scoresTensor] = await net.executeAsync(tensorInput) as [tf.Tensor, tf.Tensor, tf.Tensor];

      const classesArray = await classesTensor.array() as number[][];
      const scoresArray = await scoresTensor.array() as number[][];

      if (classesArray[0] && scoresArray[0]) {
        const scoresTensor = tf.tensor(scoresArray[0]);

        const validScores = scoresArray[0].map((score, index) => ({
          score,
          classId: classesArray[0][index]
        })).filter(({ classId }) => !isNaN(classId) && classId !== null);

        validScores.sort((a, b) => b.score - a.score);

        if (validScores.length > 0) {
          const best = validScores[0];
          const bestClassId = best.classId;

          if (!timerStartTime.current) {
            timerStartTime.current = Date.now();
          }

          if (bestClassId === lastDetectedClassId.current) {
            if (Date.now() - detectionStartTime.current >= 1500) {
              onClassIdVerified(bestClassId);
            }
          } else {
            lastDetectedClassId.current = bestClassId;
            detectionStartTime.current = Date.now();
          }

          scoresTensor.dispose();
        } else {
          lastDetectedClassId.current = null;
        }

        tf.dispose([img, resized, casted, tensorInput, boxesTensor, classesTensor, scoresTensor]);
      }
    }
  }, [onClassIdVerified]);

  useEffect(() => {
    if (model && isActive) {
      intervalRef.current = setInterval(() => {
        detectSigns(model);

        if (timerStartTime.current) {
          const elapsedTime = (Date.now() - timerStartTime.current) / 1000;
          const remainingTime = 10 - elapsedTime;
          setTimeLeft(Math.max(0, Math.ceil(remainingTime)));

          if (remainingTime <= 0) {
            setIsActive(false);
            onTimerElapsed(true);
            if (intervalRef.current) clearInterval(intervalRef.current);
          }
        }
      }, 1000);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [model, isActive, detectSigns, onTimerElapsed]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div
        style={{
          position: 'relative',
          width: '250px',
          height: '190px',
          border: '10px solid #4c51bf',
          borderRadius: '15px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden',
        }}
      >
        <Webcam
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          width="100%"
          height="100%"
          style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
        />
        <canvas ref={canvasRef} style={{
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 2,
              }} />
      </div>
      <div style={{ marginTop: '10px', fontWeight: 'bold', color: '#4c51bf' }}>
        Time Left: {timeLeft}s
      </div>
    </div>
  );
};

export default ASLDetection;

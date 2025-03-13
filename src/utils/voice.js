// src/utils/voice.js
const speakQueue = [];
let isSpeaking = false;

const speak = (text) => {
  speakQueue.push(text);
  if (!isSpeaking) {
    processQueue();
  }
};

const processQueue = () => {
  if (speakQueue.length === 0) {
    isSpeaking = false;
    return;
  }
  isSpeaking = true;
  const utterance = new SpeechSynthesisUtterance(speakQueue.shift());
  utterance.onend = processQueue;
  window.speechSynthesis.speak(utterance);
};

export { speak };
import words from 'an-array-of-english-words';
import gsap from 'gsap';
import { useEffect, useRef, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';

/*
A simple game where the player is given some characters and must type a word
that contains those characters. The player has a limited amount of time to type
the word. If the player types the word correctly, they get points. If they
don't, they lose a life. The game ends when the player runs out of lives or time.
Each character in the word adds points to the score, using the same rules as
Scrabble.
*/

function calculatePoints(word: string) {
  const letterPoints: { [key: string]: number } = {
    a: 1,
    b: 3,
    c: 3,
    d: 2,
    e: 1,
    f: 4,
    g: 2,
    h: 4,
    i: 1,
    j: 8,
    k: 5,
    l: 1,
    m: 3,
    n: 1,
    o: 1,
    p: 3,
    q: 10,
    r: 1,
    s: 1,
    t: 1,
    u: 1,
    v: 4,
    w: 4,
    x: 8,
    y: 4,
    z: 10,
  };

  return word
    .split('')
    .reduce((acc, letter) => acc + (letterPoints[letter] || 0), 0);
}

/** Generates a random string of characters of a given length. Ensures that the
 * there exists at least 100 words that can be formed with the characters. */
function generateGuessableRandomString(length: number) {
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';

  while (true) {
    result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length),
      );
    }
    const filteredWords = words.filter(word => word.includes(result));
    if (filteredWords.length >= 100) {
      break;
    }
  }

  return result;
}

function getValidWords(str: string) {
  return words.filter(word => word.includes(str));
}

function ValidWordList({ str }: { str: string }) {
  const validWords = getValidWords(str);

  return (
    <div>
      <p className="mb-2">
        There are {validWords.length} words that can be formed with the
        characters "{str}".
      </p>
      <ul>
        {validWords.map((word, index) => (
          <li key={index}>{word}</li>
        ))}
      </ul>
    </div>
  );
}

const startTime = 30;
const startLives = 3;
const startStringLength = 2;

export default function WordBomb() {
  const [input, setInput] = useState('');
  const [randomString, setRandomString] = useState(
    generateGuessableRandomString(startStringLength),
  );
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(startLives);
  const [timeLeft, setTimeLeft] = useState(startTime);
  const [description, setDescription] = useState<React.ReactNode>(
    "Type a word that contains the characters in the random string. You have 30 seconds to type as many words as you can. Each word gives you points based on the letters used. If you type a word that doesn't exist, you lose a life. If you run out of lives, the game is over. Good luck!",
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function gameOver() {
      toast.error('Game Over! You ran out of lives.');

      setDescription(
        <div>
          <p>Game Over! You ran out of lives.</p>
          <p>Your final score is: {score}</p>
          <ValidWordList str={randomString} />
        </div>,
      );
    }

    function timeUp() {
      if (lives <= 1) {
        setLives(0);
        setTimeLeft(0);
        gameOver();
        return;
      }
      toast.warning('Time is up!');

      setDescription(
        <div>
          <ValidWordList str={randomString} />
        </div>,
      );

      setLives(lives - 1);
      setTimeLeft(startTime);
      setRandomString(generateGuessableRandomString(startStringLength));
      setInput('');
    }

    if (lives <= 0) {
      return;
    }

    const timeout = setTimeout(() => {
      if (timeLeft <= 1) {
        timeUp();
      } else {
        setTimeLeft(timeLeft - 1);
      }
    }, 1000);

    return () => {
      clearTimeout(timeout);
    };
  }, [randomString, score, timeLeft, lives]);

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    setInput(event.target.value);
  }

  function success() {
    setScore(score + calculatePoints(input));
    setRandomString(generateGuessableRandomString(startStringLength));
    setInput('');
    setTimeLeft(startTime);
  }

  function shakeInput() {
    // Animate the shake
    gsap.fromTo(
      inputRef.current,
      { x: 0 },
      {
        keyframes: {
          x: [0, -10, 10, -5, 5, 0],
        },
        duration: 0.5,
        ease: 'power1.inOut',
      },
    );

    // Add the red border flash
    gsap
      .timeline()
      .to(inputRef.current, {
        borderColor: 'red',
        duration: 0.1,
      })
      .to(inputRef.current, {
        borderColor: '',
        duration: 0.3,
        delay: 0.2,
      });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (input.length === 0 || lives <= 0 || timeLeft <= 0) return;

    if (input.length < 3) {
      toast.warning('Word must be at least 3 characters long');
      return;
    }

    if (!input.includes(randomString)) {
      toast.warning(`Word must contain "${randomString}"`);
      shakeInput();
      return;
    }

    if (!words.includes(input)) {
      toast.info('Not a valid word');
      shakeInput();
      return;
    }

    success();
  }

  function resetGame() {
    setScore(0);
    setLives(startLives);
    setTimeLeft(startTime);
    setRandomString(generateGuessableRandomString(startStringLength));
    setInput('');
  }

  return (
    <>
      <ToastContainer position="top-center" autoClose={2000} />
      <div className="mx-auto p-4 text-center text-white">
        <div className="mb-2">Score: {score}</div>
        <div className="mb-2">Lives: {lives}</div>
        <div className="mb-2">Time Left: {timeLeft}s</div>
        <div className="mb-2">Random String:</div>
        <div className="mb-2 text-3xl font-bold">{randomString}</div>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            ref={inputRef}
            className="mb-4 w-full border border-white p-2 outline-0"
          />
          <button
            type="submit"
            className="cursor-pointer bg-blue-500 p-2 text-white"
          >
            Submit
          </button>
        </form>
        <button
          onClick={resetGame}
          className="mt-4 cursor-pointer bg-red-500 p-2 text-white"
        >
          Reset Game
        </button>
        <div className="mt-4">{description}</div>
      </div>
    </>
  );
}

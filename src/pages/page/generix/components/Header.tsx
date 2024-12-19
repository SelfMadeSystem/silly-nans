import { Logo } from './consts';
import classnames from 'classnames';
import { useEffect, useState } from 'react';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isScrolledFar, setIsScrolledFar] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
      setIsScrolledFar(window.scrollY > window.innerHeight - 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={classnames(
        'fixed top-0 left-0 right-0 isolate z-10 flex flex-row flex-wrap items-center justify-center gap-x-16 gap-y-4 p-4 pb-12 md:gap-48 transition-all duration-700',
        'after:absolute after:inset-0 after:-z-20 after:transition-all after:duration-700 after:fade-b-8',
        isScrolled && 'after:backdrop-blur-md',
        'before:bg-dot-grid before:absolute before:inset-0 before:-z-10 before:opacity-0 before:transition-all before:duration-700 before:fade-b-8',
        isScrolledFar && 'before:opacity-100',
      )}
    >
      <div className="shrink text-center text-3xl">
        <a href="#" className="flex flex-row items-center">
          <Logo className="text-orange-500 w-12" /> Generix
        </a>
      </div>
      <nav className="flex flex-row gap-4 md:gap-8 md:text-xl">
        <a href="#">Home</a>
        <a href="#about">About</a>
        <a href="#contact">Contact</a>
      </nav>
    </header>
  );
}

import { useCountUp } from '../hooks/useCountUp';

// Animated number in the dashboard stat tiles.
export default function AnimatedNumber({ value, className }) {
  const display = useCountUp(value, 800);
  return <p className={className}>{display}</p>;
}

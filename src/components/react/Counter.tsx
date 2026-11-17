import { useState } from 'react';

// Minimal React island used only to verify hydration during P1.
export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button type="button" onClick={() => setCount((previous) => previous + 1)}>
      React 交互测试：{count}
    </button>
  );
}

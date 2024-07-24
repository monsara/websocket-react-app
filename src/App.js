import React, { useState, useRef, useEffect } from 'react';

const App = () => {
  const [quotes, setQuotes] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [isStatisticsEnabled, setIsStatisticsEnabled] = useState(false);
  const socketRef = useRef(null);
  const startTimeRef = useRef(null);

  const handleStart = () => {
    // If there is already an active WebSocket connection, close it
    if (socketRef.current) {
      // Hide statistical data
      setStats(null)
      socketRef.current.close();
    }

    // Create a new WebSocket connection with the specified URL
    socketRef.current = new WebSocket('wss://trade.termplat.com:8800/?password=1234');

    // Save the current time in the ref to use for calculating the connection duration
    startTimeRef.current = new Date();

    // If WebSocket connection successfully opened
    socketRef.current.onopen = () => {
      // Clear any previous error state
      setError(null);
    };

    // If WebSocket connection is closed
    socketRef.current.onclose = (event) => {
      if (event.wasClean) {
        // If the connection was closed cleanly, log the code and reason for closing
        console.log(`Connection closed cleanly, code=${event.code} reason=${event.reason}`);
      } else {
        // If the connection was closed unexpectedly, set an error message
        setError('Connection died unexpectedly');
      }
    };

    // If there is an error with the WebSocket connection
    socketRef.current.onerror = (error) => {
      // Set the error message in the state
      setError(`WebSocket error: ${error.message}`);
    };

    // If message is received via WebSocket
    socketRef.current.onmessage = (event) => {
      const quote = JSON.parse(event.data);

      // Update the 'quotes' state by adding the new quote value
      setQuotes((prevQuotes) => [...prevQuotes, quote.value]);
      setIsStatisticsEnabled(true); // Enable statistics button when data arrives
    };
  };


  const handleStatistics = () => {
    // If the 'quotes' array is empty, exit the function
    if (quotes.length === 0) return;

    // Calculate the mean of the quotes
    const calcMean = quotes.reduce((sum, val) => sum + val, 0) / quotes.length;

    // Calculate the standard deviation of the quotes
    const calcStd = Math.sqrt(quotes.reduce((sum, val) => sum + (val - calcMean) ** 2, 0) / quotes.length);

    // Create a copy of the quotes array and sort it
    const sortedQuotes = [...quotes].sort((a, b) => a - b);

    // Calculate the median of the quotes
    const calcMedian = sortedQuotes.length % 2 === 0
      ? (sortedQuotes[sortedQuotes.length / 2 - 1] + sortedQuotes[sortedQuotes.length / 2]) / 2
      : sortedQuotes[Math.floor(sortedQuotes.length / 2)];

    // Calculate the mode of the quotes (the value that appears most frequently)
    const freqMap = {};
    quotes.forEach(val => freqMap[val] = (freqMap[val] || 0) + 1);
    const calcMode = Object.keys(freqMap).reduce((a, b) => freqMap[a] > freqMap[b] ? a : b);

    // Calculate the time spent since the WebSocket connection was started
    const timeSpent = new Date() - startTimeRef.current;

    // Set the 'stats' state with the calculated statistical data
    setStats({
      mean: parseFloat(calcMean.toFixed(2)),
      std: parseFloat(calcStd.toFixed(2)),
      median: calcMedian,
      mode: calcMode,
      timeSpent,
      lostQuotes: 0,
    });
  };


  useEffect(() => {
    return () => {
      // Close the WebSocket connection when the component is unmounted
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  return (
    <div className="app">
      <div className="buttons">
        <button type="button" className="btn" onClick={handleStart}>Старт</button>
        <button type="button" className="btn" onClick={handleStatistics} disabled={!isStatisticsEnabled}>Статистика</button>
      </div>

      {error && <div className="error">{error}</div>}

      {stats && (
        <div className="stats">
          <p><strong>Среднее:</strong> {stats.mean}</p>
          <p><strong>Стандартное отклонение:</strong> {stats.std}</p>
          <p><strong>Мода:</strong> {stats.mode}</p>
          <p><strong>Медиана:</strong> {stats.median}</p>
          <p><strong>Количество потерянных котировок:</strong> {stats.lostQuotes}</p>
          <p><strong>Время потраченное на расчеты:</strong> {stats.timeSpent} мс</p>
        </div>
      )}
    </div>
  );
};

export default App;

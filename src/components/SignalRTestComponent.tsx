import React from 'react';
import { useSignalR } from '../utils/signalRService';

const SignalRTestComponent: React.FC = () => {
  const { isConnected, sendMessage } = useSignalR({
    onMessage: (message) => {
      console.log('Test component received message:', message);
    }
  });

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '10px' }}>
      <h3>SignalR Connection Test</h3>
      <p>Status: <strong style={{ color: isConnected ? 'green' : 'red' }}>
        {isConnected ? 'Connected' : 'Disconnected'}
      </strong></p>
      <button 
        onClick={() => sendMessage('TestMethod', 'Hello from test component')}
        disabled={!isConnected}
      >
        Send Test Message
      </button>
    </div>
  );
};

export default SignalRTestComponent;
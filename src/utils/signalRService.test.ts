import { renderHook } from '@testing-library/react';
import { useSignalR } from './signalRService';
import * as signalR from "@microsoft/signalr";

// Mock SignalR
jest.mock('@microsoft/signalr');

describe('useSignalR', () => {
  let mockConnection: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    mockConnection = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      onclose: jest.fn(),
      onreconnected: jest.fn(),
      state: signalR.HubConnectionState.Disconnected,
    };

    const mockBuilder = {
      withUrl: jest.fn().mockReturnThis(),
      withAutomaticReconnect: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue(mockConnection),
    };

    (signalR.HubConnectionBuilder as jest.Mock).mockImplementation(() => mockBuilder);
  });

  it('should create only one connection when hook is initialized', () => {
    const onMessage = jest.fn();
    
    // Render hook
    renderHook(() => useSignalR({ onMessage }));
    
    // Should create only one connection
    expect(signalR.HubConnectionBuilder).toHaveBeenCalledTimes(1);
    expect(mockConnection.start).toHaveBeenCalledTimes(1);
  });

  it('should not create duplicate connections in StrictMode simulation', () => {
    const onMessage = jest.fn();
    
    // Render hook twice to simulate React StrictMode behavior
    const { rerender } = renderHook(() => useSignalR({ onMessage }));
    rerender();
    
    // Should still create only one connection
    expect(signalR.HubConnectionBuilder).toHaveBeenCalledTimes(1);
    expect(mockConnection.start).toHaveBeenCalledTimes(1);
  });

  it('should properly cleanup connection when unmounted', () => {
    const onMessage = jest.fn();
    
    const { unmount } = renderHook(() => useSignalR({ onMessage }));
    
    // Unmount to trigger cleanup
    unmount();
    
    expect(mockConnection.stop).toHaveBeenCalledTimes(1);
  });
});
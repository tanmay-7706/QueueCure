/**
 * useQueueSocket.js — Custom React hook for queue state + socket actions.
 *
 * Listens for `queue:update` events and stores the latest state.
 * Exposes action functions that emit socket events.
 * The `callNext` action generates a UUID requestId for idempotency and
 * manages a `isCallingNext` flag to disable the button until the server
 * acknowledges via the next `queue:update` (or a 5s timeout).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import socket from '../lib/socket';

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useQueueSocket() {
  const [queueState, setQueueState] = useState(null);
  const [isCallingNext, setIsCallingNext] = useState(false);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [lastAction, setLastAction] = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    function onQueueUpdate(data) {
      setQueueState(data);
      if (isCallingNext) {
        setIsCallingNext(false);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
    }

    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on('queue:update', onQueueUpdate);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('queue:update', onQueueUpdate);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isCallingNext]);

  const addPatient = useCallback((name, doctorId = 'default') => {
    if (!name.trim()) {
      setLastAction({ type: 'error', message: 'Patient name is required.', timestamp: Date.now() });
      return;
    }
    socket.emit('receptionist:addPatient', { name, doctorId });
    setLastAction({ type: 'success', message: `Added "${name}" to queue`, timestamp: Date.now() });
  }, []);

  const callNext = useCallback((doctorId = 'default') => {
    if (isCallingNext) return;
    
    // Check for empty queue locally to avoid emitting a non-standard socket event
    if (queueState && (!queueState.waitingTokens || queueState.waitingTokens.length === 0)) {
      setLastAction({ type: 'warning', message: 'No patients waiting.', timestamp: Date.now() });
      return;
    }

    const requestId = generateId();
    setIsCallingNext(true);
    socket.emit('receptionist:callNext', { doctorId, requestId });

    timeoutRef.current = setTimeout(() => {
      setIsCallingNext(false);
      setLastAction({ type: 'error', message: 'No response from server — please try again.', timestamp: Date.now() });
    }, 5000);

    setLastAction({ type: 'success', message: 'Called next patient', timestamp: Date.now() });
  }, [isCallingNext, queueState]);

  const undoLastCall = useCallback((doctorId = 'default') => {
    if (queueState && !queueState.canUndo) {
      setLastAction({ type: 'error', message: 'Nothing to undo.', timestamp: Date.now() });
      return;
    }
    socket.emit('receptionist:undoLastCall', { doctorId });
    setLastAction({ type: 'success', message: 'Undid last call', timestamp: Date.now() });
  }, [queueState]);

  const setAvgConsultTime = useCallback((minutes, doctorId = 'default') => {
    if (!minutes || Number(minutes) < 1) {
      setLastAction({ type: 'error', message: 'Invalid consultation time.', timestamp: Date.now() });
      return;
    }
    socket.emit('receptionist:setAvgConsultTime', { doctorId, minutes: Number(minutes) });
    setLastAction({ type: 'success', message: `Set avg. consultation time to ${minutes} min`, timestamp: Date.now() });
  }, []);

  const clearLastAction = useCallback(() => {
    setLastAction(null);
  }, []);

  const setDoctorStatus = useCallback((isOnBreak, doctorId = 'default') => {
    socket.emit('receptionist:setDoctorStatus', { doctorId, isOnBreak });
    setLastAction({
      type: isOnBreak ? 'warning' : 'success',
      message: isOnBreak ? 'Doctor marked on break' : 'Doctor back — queue resumed',
      timestamp: Date.now(),
    });
  }, []);

  const resetSession = useCallback((doctorId = 'default') => {
    if (!window.confirm('Reset the entire session? This will clear all patients and history. This cannot be undone.')) return;
    socket.emit('receptionist:resetSession', { doctorId });
    setLastAction({ type: 'warning', message: 'Session reset — ready for a new day', timestamp: Date.now() });
  }, []);

  return {
    queueState,
    isCallingNext,
    isConnected,
    lastAction,
    addPatient,
    callNext,
    undoLastCall,
    setAvgConsultTime,
    setDoctorStatus,
    resetSession,
    clearLastAction,
  };
}

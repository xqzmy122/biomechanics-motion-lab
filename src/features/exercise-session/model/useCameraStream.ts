import { useCallback, useEffect, useRef, useState } from 'react'

const CAMERA_SESSION_KEY = 'biolab-camera-granted'

const getUserMediaErrorMessage = (e: unknown): string => {
  if (e instanceof DOMException) {
    if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
      return 'Camera access was denied. Allow the camera when your browser prompts you, or turn it on for this site in browser settings, then tap Try again.'
    }
    if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
      return 'No camera was found on this device.'
    }
    if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
      return 'The camera is already in use or could not be started. Close other apps using the camera and try again.'
    }
    if (e.name === 'OverconstrainedError' || e.name === 'ConstraintNotSatisfiedError') {
      return 'This camera does not support the requested mode. Try again with a different camera if available.'
    }
    if (e.name === 'SecurityError') {
      return 'Camera is blocked in this context. Open the app over HTTPS or at http://localhost.'
    }
    return `Camera error: ${e.message}`
  }
  return 'Could not open the camera.'
}

export type ICameraFacingPreference = 'environment' | 'user' | 'any'

const tryGetStream = async (
  constraints: MediaStreamConstraints,
): Promise<MediaStream> => {
  return navigator.mediaDevices.getUserMedia(constraints)
}

const acquireStream = async (
  preference: ICameraFacingPreference,
): Promise<{ stream: MediaStream; facingUser: boolean }> => {
  const attempts: MediaStreamConstraints[] =
    preference === 'user'
      ? [
          { video: { facingMode: { ideal: 'user' } }, audio: false },
          { video: true, audio: false },
        ]
      : preference === 'environment'
        ? [
            { video: { facingMode: { ideal: 'environment' } }, audio: false },
            { video: true, audio: false },
          ]
        : [{ video: true, audio: false }]

  let lastError: unknown
  for (const constraints of attempts) {
    try {
      const stream = await tryGetStream(constraints)
      const track = stream.getVideoTracks()[0]
      const settings = track?.getSettings() ?? {}
      return { stream, facingUser: settings.facingMode === 'user' }
    } catch (e) {
      lastError = e
    }
  }

  throw lastError
}

export const markCameraGrantedInSession = () => {
  try {
    sessionStorage.setItem(CAMERA_SESSION_KEY, '1')
  } catch {
    /* sessionStorage unavailable */
  }
}

export const isCameraGrantedInSession = (): boolean => {
  try {
    return sessionStorage.getItem(CAMERA_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

const isCameraPermissionGranted = async (): Promise<boolean> => {
  if (!navigator.permissions?.query) return false
  try {
    const status = await navigator.permissions.query({ name: 'camera' as PermissionName })
    return status.state === 'granted'
  } catch {
    return false
  }
}

export interface IUseCameraStreamOptions {
  facingPreference?: ICameraFacingPreference
  autoRequest?: boolean
}

export interface IUseCameraStreamResult {
  stream: MediaStream | null
  error: string | null
  facingUser: boolean
  isRequesting: boolean
  canUseCamera: boolean
  requestCamera: () => Promise<void>
}

export const useCameraStream = (
  options: IUseCameraStreamOptions = {},
): IUseCameraStreamResult => {
  const { facingPreference = 'environment', autoRequest = true } = options
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [facingUser, setFacingUser] = useState(false)
  const [isRequesting, setIsRequesting] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  const autoRequestedRef = useRef(false)

  const canUseCamera =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    (typeof window === 'undefined' || window.isSecureContext)

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setStream(null)
  }, [])

  const requestCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser does not support camera access.')
      return
    }
    if (!window.isSecureContext) {
      setError(
        'Camera needs a secure page. Use https:// or open the app at http://localhost.',
      )
      return
    }

    setIsRequesting(true)
    setError(null)
    stopTracks()

    try {
      const { stream: next, facingUser: fu } = await acquireStream(facingPreference)
      streamRef.current = next
      setStream(next)
      setFacingUser(fu)
      markCameraGrantedInSession()
    } catch (e) {
      setError(getUserMediaErrorMessage(e))
    } finally {
      setIsRequesting(false)
    }
  }, [facingPreference, stopTracks])

  useEffect(() => {
    if (!autoRequest || !canUseCamera || stream || autoRequestedRef.current) return

    autoRequestedRef.current = true

    const tryAutoRequest = async () => {
      const sessionGranted = isCameraGrantedInSession()
      const permGranted = await isCameraPermissionGranted()
      if (sessionGranted || permGranted) {
        await requestCamera()
      }
    }

    void tryAutoRequest()
  }, [autoRequest, canUseCamera, stream, requestCamera])

  useEffect(() => {
    return () => {
      stopTracks()
    }
  }, [stopTracks])

  return {
    stream,
    error,
    facingUser,
    isRequesting,
    canUseCamera,
    requestCamera,
  }
}

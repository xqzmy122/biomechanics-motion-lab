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
          { video: { facingMode: { exact: 'user' } }, audio: false },
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

const detectCameraCapabilities = async (): Promise<{
  hasFrontCamera: boolean
  hasBackCamera: boolean
  canSwitchCamera: boolean
}> => {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return { hasFrontCamera: false, hasBackCamera: true, canSwitchCamera: false }
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoInputs = devices.filter((d) => d.kind === 'videoinput')

    if (videoInputs.length === 0) {
      return { hasFrontCamera: false, hasBackCamera: false, canSwitchCamera: false }
    }

    const hasFrontCamera = videoInputs.some((d) =>
      /front|user|facetime|selfie|integrated/i.test(d.label),
    )
    const hasBackCamera = videoInputs.some((d) =>
      /back|rear|environment|wide|tele/i.test(d.label),
    )

    return {
      hasFrontCamera: hasFrontCamera || videoInputs.length > 1,
      hasBackCamera: hasBackCamera || videoInputs.length > 0,
      canSwitchCamera: videoInputs.length > 0,
    }
  } catch {
    return { hasFrontCamera: false, hasBackCamera: true, canSwitchCamera: false }
  }
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
  initialFacing?: ICameraFacingPreference
  autoRequest?: boolean
}

export interface IUseCameraStreamResult {
  stream: MediaStream | null
  error: string | null
  facingUser: boolean
  isRequesting: boolean
  canUseCamera: boolean
  hasFrontCamera: boolean
  canSwitchCamera: boolean
  requestCamera: () => Promise<void>
  switchToFrontCamera: () => Promise<void>
  switchToBackCamera: () => Promise<void>
  toggleCamera: () => Promise<void>
}

export const useCameraStream = (
  options: IUseCameraStreamOptions = {},
): IUseCameraStreamResult => {
  const { initialFacing = 'environment', autoRequest = true } = options
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [facingUser, setFacingUser] = useState(false)
  const [isRequesting, setIsRequesting] = useState(false)
  const [hasFrontCamera, setHasFrontCamera] = useState(false)
  const [canSwitchCamera, setCanSwitchCamera] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  const autoRequestedRef = useRef(false)
  const facingPreferenceRef = useRef<ICameraFacingPreference>(initialFacing)

  const canUseCamera =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    (typeof window === 'undefined' || window.isSecureContext)

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setStream(null)
  }, [])

  const refreshCameraCapabilities = useCallback(async () => {
    const caps = await detectCameraCapabilities()
    setHasFrontCamera(caps.hasFrontCamera)
    setCanSwitchCamera(caps.canSwitchCamera)
  }, [])

  const openCamera = useCallback(async (preference: ICameraFacingPreference) => {
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
    facingPreferenceRef.current = preference

    try {
      const { stream: next, facingUser: fu } = await acquireStream(preference)
      streamRef.current = next
      setStream(next)
      setFacingUser(fu)
      markCameraGrantedInSession()
      await refreshCameraCapabilities()
    } catch (e) {
      setError(getUserMediaErrorMessage(e))
    } finally {
      setIsRequesting(false)
    }
  }, [refreshCameraCapabilities, stopTracks])

  const requestCamera = useCallback(async () => {
    await openCamera(facingPreferenceRef.current)
  }, [openCamera])

  const switchToFrontCamera = useCallback(async () => {
    await openCamera('user')
  }, [openCamera])

  const switchToBackCamera = useCallback(async () => {
    await openCamera('environment')
  }, [openCamera])

  const toggleCamera = useCallback(async () => {
    const next = facingUser ? 'environment' : 'user'
    await openCamera(next)
  }, [facingUser, openCamera])

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
    hasFrontCamera,
    canSwitchCamera,
    requestCamera,
    switchToFrontCamera,
    switchToBackCamera,
    toggleCamera,
  }
}

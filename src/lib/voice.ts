import { TURN_CREDENTIAL, TURN_URLS, TURN_USERNAME } from './config'

/**
 * Voice between two players, straight from one browser to the other (WebRTC). The handshake messages travel over
 * whatever live channel the two share (a tour, or a couple's home). Used by tours and by couples at home.
 */

export type Signal = { description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }
export type Mic = 'off' | 'on' | 'muted'
export type Hearing = 'none' | 'live' | 'tap'
/** How the voice line is doing, shown next to the mic */
export type Line = 'idle' | 'connecting' | 'connected' | 'failed'

const ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  // A relay for networks that block a direct connection (set up in config.ts)
  ...(TURN_URLS.length ? [{ urls: TURN_URLS, username: TURN_USERNAME, credential: TURN_CREDENTIAL }] : []),
]

export type Voice = {
  /** A handshake message from the other player */
  onSignal: (s: Signal) => Promise<void>
  /** Turn the microphone on, or mute and unmute it. Returns the new state, or null if the mic is blocked. */
  toggleMic: () => Promise<Mic | null>
  /** Phones only play sound after a tap: this is that tap */
  hear: () => void
  stop: () => void
}

export function createVoice({ send, polite, onHearing, onLine }: { send: (s: Signal) => void; polite: boolean; onHearing: (h: Hearing) => void; onLine?: (l: Line) => void }): Voice {
  let pc: RTCPeerConnection | null = null
  let stream: MediaStream | null = null
  let makingOffer = false
  let ignoreOffer = false
  let speaker: HTMLAudioElement | null = null
  let restarted = false

  /** The speaker is a real (hidden) part of the page and plays inline: iPhones need both to play call audio */
  function speakerEl() {
    if (!speaker) {
      speaker = document.createElement('audio')
      speaker.autoplay = true
      speaker.setAttribute('playsinline', '')
      speaker.style.display = 'none'
      document.body.appendChild(speaker)
    }
    return speaker
  }

  function connection() {
    if (pc) return pc
    pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    onLine?.('connecting')
    pc.onconnectionstatechange = () => {
      const s = pc?.connectionState
      if (s === 'connected') onLine?.('connected')
      else if (s === 'failed') {
        // Try once more (the network may have changed), then report it
        if (!restarted && pc) {
          restarted = true
          pc.restartIce()
          onLine?.('connecting')
        } else onLine?.('failed')
      } else if (s === 'connecting' || s === 'new') onLine?.('connecting')
    }
    pc.onnegotiationneeded = async () => {
      try {
        makingOffer = true
        await pc!.setLocalDescription()
        send({ description: pc!.localDescription?.toJSON() })
      } catch {
        // The next negotiation will try again
      } finally {
        makingOffer = false
      }
    }
    pc.onicecandidate = ({ candidate }) => candidate && send({ candidate: candidate.toJSON() })
    pc.ontrack = ({ streams }) => {
      const el = speakerEl()
      el.srcObject = streams[0]
      el.play()
        .then(() => onHearing('live'))
        .catch(() => onHearing('tap'))
    }
    return pc
  }

  return {
    // "Perfect negotiation": either side can start talking first without the two offers clashing
    async onSignal({ description, candidate }) {
      const c = connection()
      try {
        if (description) {
          const collision = description.type === 'offer' && (makingOffer || c.signalingState !== 'stable')
          ignoreOffer = !polite && collision
          if (ignoreOffer) return
          await c.setRemoteDescription(description)
          if (description.type === 'offer') {
            await c.setLocalDescription()
            send({ description: c.localDescription?.toJSON() })
          }
        } else if (candidate) {
          await c.addIceCandidate(candidate).catch(() => {
            if (!ignoreOffer) throw new Error('ice')
          })
        }
      } catch {
        // A failed handshake step: voice just doesn't connect this time; chat carries on
      }
    },
    async toggleMic() {
      // This tap also unlocks the speaker on phones, so the other player's voice can play when it arrives
      void speakerEl()
        .play()
        .catch(() => {})
      if (stream) {
        const track = stream.getAudioTracks()[0]
        track.enabled = !track.enabled
        return track.enabled ? 'on' : 'muted'
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
        const c = connection()
        stream.getTracks().forEach((t) => c.addTrack(t, stream!))
        return 'on'
      } catch {
        return null
      }
    },
    hear() {
      void speaker
        ?.play()
        .then(() => onHearing('live'))
        .catch(() => {})
    },
    stop() {
      stream?.getTracks().forEach((t) => t.stop())
      stream = null
      pc?.close()
      pc = null
      makingOffer = false
      ignoreOffer = false
      if (speaker) {
        speaker.srcObject = null
        speaker.remove()
        speaker = null
      }
      onLine?.('idle')
    },
  }
}

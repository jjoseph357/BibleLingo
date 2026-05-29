import { Audio } from 'expo-av';

class AudioService {
  private correctSound: Audio.Sound | null = null;
  private scribeSound: Audio.Sound | null = null;
  private finishSound: Audio.Sound | null = null;

  async init() {
    try {
      // NOTE: These are placeholder references.
      // The user must place the actual .mp3 files in the assets/sounds folder.
      // Uncomment the lines below once the files are in place.

      /*
      const { sound: cSound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/correct.mp3')
      );
      this.correctSound = cSound;

      const { sound: sSound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/bass_drop.mp3')
      );
      this.scribeSound = sSound;

      const { sound: fSound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/finish.mp3')
      );
      this.finishSound = fSound;
      */
    } catch (e) {
      console.warn("AudioService: Placeholder sounds not found.", e);
    }
  }

  async playCorrect() {
    try {
      if (this.correctSound) {
        await this.correctSound.replayAsync();
      }
    } catch (e) {}
  }

  async playScribeFinish() {
    try {
      if (this.scribeSound) {
        await this.scribeSound.replayAsync();
      }
    } catch (e) {}
  }

  async playLessonFinish() {
    try {
      if (this.finishSound) {
        await this.finishSound.replayAsync();
      }
    } catch (e) {}
  }
}

export const audioService = new AudioService();

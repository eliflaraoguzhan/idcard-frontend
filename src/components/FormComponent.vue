<template>
  <div class="container">
    <h1>Read and Save User From Identity Card</h1>
    <form @submit.prevent="submitData" class="form">
      <div class="input-group">
        <input type="text" v-model="DN" placeholder="Enter Document Number" required />
      </div>
      <div class="input-group">
        <input type="text" v-model="DT" placeholder="Enter Date of Birth" required />
      </div>
      <div class="input-group">
        <input type="text" v-model="GT" placeholder="Enter Expiry Date" required />
      </div>

      <!-- Webcam Video or Captured Image -->
      <div class="video-container">
        <div v-if="!hasCapturedImage">
          <video ref="video" class="media" autoplay></video>
        </div>
        <div v-if="hasCapturedImage">
          <img :src="'data:image/jpeg;base64,' + Cam_Data" alt="Captured Image" class="media" />
        </div>
      </div>

      <!-- Status Messages -->
      <div class="status-container">
        <p v-if="countdown > 0" class="countdown">{{ countdown }}</p>
        <p v-if="hasCapturedImage && countdown === 0" class="message success">Image Captured</p>
        <p v-if="!hasCapturedImage && countdown === 0 && noFaceDetected" class="message error">No Face Detected</p>
      </div>

      <!-- Buttons -->
      <div class="button-group">
        <button type="button" @click="recaptureImage" class="btn recapture">Recapture Image</button>
        <button type="button" @click="goToUserInfo" class="btn info">Show Information</button>
        <button type="submit" class="btn submit">Submit</button>
      </div>
    </form>

    <!-- Display response data in a formatted way -->
    <div v-if="responseData" class="response">
      <p><strong>SAVED TO DATABASE!</strong> </p>
      <p><strong>Is Face Matched:</strong> {{ responseData.eslesmeSonucu }}</p>
      <p><strong>ID:</strong> {{ responseData.id }}</p>
      <p><strong>Name:</strong> {{ responseData.isim }}</p>
      <p><strong>Score:</strong> {{ responseData.skor }}</p>
    </div>
  </div>
</template>


<script>
import * as faceapi from 'face-api.js';
import axios from 'axios';
import CryptoJS from 'crypto-js';

export default {
  data() {
    return {
      DN: '',
      DT: '',
      GT: '',
      Cam_Data: '', 
      responseData: null,
      hasCapturedImage: false, 
      countdown: 0, 
      detectionInterval: null,
      countdownInterval: null,
      noFaceDetected: false, 
      encryptionKey: 'my-secret-key-12', // ENCRYPTION KEY
      faceDetected: false, 
    };
  },
  async mounted() {
    await this.loadModels();
    this.getWebcamAccess();
  },
  methods: {
    async loadModels() {
      const MODEL_URL = '/models'; 
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      console.log('FaceAPI models loaded');
    },
    getWebcamAccess() {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          const videoElement = this.$refs.video;
          if (videoElement) {
            videoElement.srcObject = stream;
            this.startFaceDetection();
          }
        })
        .catch((err) => {
          console.error('Error accessing webcam: ', err);
        });
    },
    startFaceDetection() {
      const video = this.$refs.video;

      this.detectionInterval = setInterval(async () => {
        if (!this.hasCapturedImage && video) {
          try {
            const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
            if (detections.length > 0) {
              this.noFaceDetected = false;
              if (!this.faceDetected) {
                this.faceDetected = true;
                this.startCountdown(); 
              }
            } else {
              this.faceDetected = false;
              this.noFaceDetected = true;
              this.stopCountdown(); 
            }
          } catch (error) {
            console.error('Error in face detection:', error);
          }
        }
      }, 1000); 
    },
    startCountdown() {
      this.stopCountdown();

      this.countdown = 3; 
      this.countdownInterval = setInterval(() => {
        if (this.countdown > 1 && this.faceDetected) {
          this.countdown -= 1;
        } else if (this.countdown === 1 && this.faceDetected) {
          clearInterval(this.countdownInterval);
          this.captureImage();
        } else {
          this.stopCountdown();
        }
      }, 1000);
    },
    stopCountdown() {
      if (this.countdownInterval) {
        clearInterval(this.countdownInterval);
      }
      this.countdown = 0; 
    },
    captureImage() {
      const video = this.$refs.video;


      if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
        console.error('Video element is not ready for capturing');
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      let base64Data = canvas.toDataURL('image/jpeg'); 
      
      
      base64Data = base64Data.replace(/^data:image\/(png|jpeg);base64,/, '');
      
      this.Cam_Data = base64Data;
      this.hasCapturedImage = true; 
      console.log('Captured Image Base64:', this.Cam_Data);


      clearInterval(this.detectionInterval);
      this.stopCountdown();
    },
    recaptureImage() {
      this.stopCountdown(); 
      clearInterval(this.detectionInterval); 

      this.hasCapturedImage = false;
      this.Cam_Data = '';
      this.noFaceDetected = false;
      this.faceDetected = false;

      this.getWebcamAccess(); 
    },
    encryptField(field) {
      try {
        const iv = CryptoJS.enc.Utf8.parse('my-fixed-iv-1234'); // Fixed IV, 16 bytes
        const key = CryptoJS.enc.Utf8.parse(this.encryptionKey);

        const fieldStr = field.toString();
        const encrypted = CryptoJS.AES.encrypt(fieldStr, key, {
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        });

        let encryptedBase64 = encrypted.toString();

        return encryptedBase64; 
      } catch (error) {
        console.error('Error encrypting field:', error);
        return ''; 
      }
    },
    goToUserInfo() {
      this.$router.push('/user-info');
    },
    submitData() {
      const requestData = {
        DN: this.DN,
        DT: this.DT,
        GT: this.GT,
        PATH: 'C:/Users/elifl/Downloads',
        isEAC: false,
        isFaceMatch: false,
        isFaceMatchN: false,
      };

      axios.post('http://localhost:8089/api/read', null, {
        params: requestData,
      })
      .then(response => {
        console.log('Server response:', response);  
        
        //this.responseData = response.data;
        this.sendDataToAnotherAPI(response.data);
      })
      .catch(error => {
        console.error('Error sending data:', error);
        if (error.response) {
          console.error('Error details:', error.response.data);
        } else {
          console.error('Error details: No response received');
        }
      });
    },
    sendDataToAnotherAPI(data) {
      const formData = new FormData();

      formData.append('ID', this.encryptField(data.ID || ''));
      formData.append('Ad', this.encryptField(data.Ad || ''));
      formData.append('Soyad', this.encryptField(data.Soyad || ''));
      formData.append('TCKN', this.encryptField(data.TCKN || ''));
      formData.append('Dogum_Tarihi', this.encryptField(data.Dogum_Tarihi || ''));
      formData.append('Belge_Numarasi', this.encryptField(data.Belge_Numarasi || ''));
      formData.append('Dogum_Yeri', this.encryptField(data.Dogum_Yeri || ''));
      formData.append('Son_Kullanim_Tarihi', this.encryptField(data.Son_Kullanim_Tarihi || ''));
      formData.append('Cinsiyet', this.encryptField(data.Cinsiyet || ''));
      formData.append('Uyruk', this.encryptField(data.Uyruk || ''));
      formData.append('Other_names', this.encryptField(data.Other_names || ''));
      formData.append('NOH', this.encryptField(data.NOH || ''));
      formData.append('POB', this.encryptField(data.POB || ''));
      formData.append('Adres', this.encryptField(data.Adres || ''));
      formData.append('IMAGE', this.encryptField(data.IMAGE || ''));
      formData.append('Cam_Data', this.encryptField(this.Cam_Data)); 

      for (let [key, value] of formData.entries()) { 
        console.log(`${key}: ${value}`);
      }

      axios.post('http://192.168.1.158:9099/insert', formData)
      .then(response => {
        this.responseData = response.data;
        console.log('Data sent to new API:', response.data);
      })
      .catch(error => {
        console.error('Error sending data to new API:', error);
        console.log('Error details:', error.response?.data);
      });
    }
  },
  beforeUnmount() {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval); 
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval); 
    }
  }
};
</script>

<style scoped>

.container {
  max-width: 600px;
  margin: 20px auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 10px;
  background-color: #f9f9f9;
}


.input-group {
  margin-bottom: 15px;
}

input[type="text"] {
  width: 100%;
  padding: 10px;
  margin-top: 5px;
  border-radius: 5px;
  border: 1px solid #ccc;
}


.video-container {
  display: flex;
  justify-content: center;
  margin-bottom: 15px;
}


.media {
  width: 320px;
  height: 240px;
  object-fit: cover;
}


.button-group {
  display: flex;
  justify-content: space-between;
}

button.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
}

button.recapture {
  background-color: #f44336;
  color: white;
}

button.submit {
  background-color: #4CAF50;
  color: white;
}

button.info {
  background-color: rgb(61, 61, 215);
  color: white;
}

button.btn:hover {
  opacity: 0.8;
}


.message {
  margin-top: 10px;
  font-size: 16px;
  text-align: center;
}

.success {
  color: green;
}

.error {
  color: red;
}


.status-container {
  height: 50px; 
  display: flex;
  justify-content: center;
  align-items: center;
}

.countdown {
  font-size: 30px;
  text-align: center;
  font-weight: bold;
}

.response {
  margin-top: 20px;
  padding: 10px;
  border-radius: 5px;
  background-color: #e0f7fa;
  color: #00796b;
  font-size: 14px;
  word-wrap: break-word;
}

</style>
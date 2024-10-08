<template>
  <div class="container">
    <button type="button" @click="downloadLog" class="btn errorlog">Download Logss</button>
    <button type="button" @click="toggleApiInput" class="btn setApiUrl">Set API URL</button>
    <button type="button" @click="togglePathInput" class="btn setFolder">Set Download Folder Path</button>
    <button type="button" @click="sendDataSoap" class="btn sendData">Send Data to Soap</button>
    <button type="button" @click="toggleOCRInput" class="btn ocrButton">Scan with OCR</button>
    <div v-if="showOCRInput" class="ocr-input-container">
      <input type="file" @change="handleFileUpload" />
    </div>

    <div v-if="soapResponse" class="soap-response">
      <p><strong>Does it exist: </strong> {{ soapResponse }}</p>
    </div>

    <div v-if="showApiInput" class="api-input-container">
      <label for="apiUrl">Enter API URL:</label>
      <input type="text" v-model="apiUrl" id="apiUrl" />
      <button type="button" @click="saveApiUrl" class="btn saveApiUrl">Save</button>
    </div>

    <div v-if="showPathInput" class="path-input-container">
      <label for="folderPath">Enter Download Path:</label>
      <input type="text" v-model="folderPath" id="folderPath" />
      <button type="button" @click="saveFolderPath" class="btn saveFolderPath">Save</button>
    </div>

    <h1>Read and Save User From Identity Card</h1>
    <form @submit.prevent="submitData" class="form">
      <div class="input-group">
        <input type="text" v-model="DN" placeholder="Enter Document Number" required />
      </div>
      <div class="input-group">
        <input type="date" v-model="DT" placeholder="Enter Date of Birth" required />
      </div>
      <div class="input-group">
        <input type="date" v-model="GT" placeholder="Enter Expiry Date" required />
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

    <div v-if="responseData" class="response">
      <p><strong>SAVED TO DATABASE!</strong> </p>
      <p><strong>Is Face Matched:</strong> {{ responseData.eslesmeSonucu }}</p>
      <p><strong>ID:</strong> {{ responseData.id }}</p>
      <p><strong>Name:</strong> {{ responseData.isim }}</p>
      <p><strong>Score:</strong> {{ responseData.skor }}</p>
    </div>

    <!-- Error Message-->
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>

  </div>
</template>


<script>
import * as faceapi from 'face-api.js';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import Logger from '@/logger';
import Tesseract from 'tesseract.js';

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
      encryptionKey: 'my-secret-key-12',
      faceDetected: false,
      apiUrl: '', // Store the API URL
      folderPath: '', // Store the Folder Path
      showApiInput: false, // Control visibility of the API input field
      showPathInput: false, // Control visibility of the Path input field
      TCKN: '',
      name: '',
      surname: '',
      birthYear: '',
      soapResponse: null,
      errorMessage: null,
      showOCRInput: false

    };
  },
  async mounted() {
    Logger.info('Component mounted, loading models and accessing webcam');
    this.loadApiUrl();
    this.loadFolderPath();
    await this.loadModels();
    this.getWebcamAccess();
  },
  beforeUnmount() {
    Logger.info('Component before unmounting, clearing intervals');
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval); 
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval); 
    }
  },
  methods: {
    loadApiUrl() {
      const storedApiUrl = localStorage.getItem('apiUrl');
      if (storedApiUrl) {
        this.apiUrl = storedApiUrl;
      } else {
        this.apiUrl = 'http://localhost:8089'; // Default value
      }
    },
    toggleApiInput() {
      this.showApiInput = !this.showApiInput;
      if(this.showPathInput == true){
        this.showPathInput = false;
      }
    },
    saveApiUrl() {
      localStorage.setItem('apiUrl', this.apiUrl);
      Logger.info('API URL saved: ' + this.apiUrl);
      this.showApiInput = false;
    },

    loadFolderPath() {
      const storedPath = localStorage.getItem('folderPath');
      if (storedPath) {
        this.folderPath = storedPath;
      } else {
        this.folderPath = 'C:/Users/elifl/Downloads'; // Default value
      }
    },
    togglePathInput() {
      this.showPathInput = !this.showPathInput;
      if(this.showApiInput == true){
        this.showApiInput = false;
      }
    },
    saveFolderPath() {
      localStorage.setItem('folderPath', this.folderPath);
      Logger.info('Download Folder saved as: ' + this.folderPath);
      this.showPathInput = false; 
    },

    async loadModels() {
      try {
        const MODEL_URL = '/models'; 
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        Logger.info('FaceAPI models loaded successfully');
      } catch (error) {
        this.errorMessage = error.request.response;
        console.log(error);
        Logger.error('Failed to load FaceAPI models: ' + error.message);
      }
    },
    getWebcamAccess() {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          const videoElement = this.$refs.video;
          if (videoElement) {
            videoElement.srcObject = stream;
            Logger.info('Webcam access granted, starting face detection');
            this.startFaceDetection();
          }
        })
        .catch((error) => {
          this.errorMessage = error.request.response;
          console.log(error);
          Logger.error('Error accessing webcam: ' + error.message);
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
              Logger.debug('Face detected, starting countdown');
              if (!this.faceDetected) {
                this.faceDetected = true;
                this.startCountdown(); 
              }
            } else {
              this.faceDetected = false;
              this.noFaceDetected = true;
              Logger.warn('No face detected, stopping countdown');
              this.stopCountdown(); 
            }
          } catch (error) {
            this.errorMessage = error.request.response;
            console.log(error);
            Logger.error('Error in face detection: ' + error.message);
          }
        }
      }, 1000); 
    },
    startCountdown() {
      Logger.info('Starting countdown for capturing image');
      this.stopCountdown();

      this.countdown = 3; 
      this.countdownInterval = setInterval(() => {
        if (this.countdown > 1 && this.faceDetected) {
          this.countdown -= 1;
          Logger.debug(`Countdown: ${this.countdown}`);
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
      Logger.debug('Countdown stopped');
    },
    captureImage() {
      const video = this.$refs.video;

      if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
        const error = 'Video element is not ready for capturing';
        Logger.error(error);
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
      Logger.info('Image captured successfully');

      clearInterval(this.detectionInterval);
      this.stopCountdown();
    },
    recaptureImage() {
      Logger.info('Recapturing image');
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
        const iv = CryptoJS.enc.Utf8.parse('my-fixed-iv-1234'); 
        const key = CryptoJS.enc.Utf8.parse(this.encryptionKey);

        const fieldStr = field.toString();
        const encrypted = CryptoJS.AES.encrypt(fieldStr, key, {
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        });

        let encryptedBase64 = encrypted.toString();
        Logger.debug('Field encrypted successfully');
        return encryptedBase64; 
      } catch (error) {
        this.errorMessage = error.request.response;
        console.log(error);
        Logger.error('Error encrypting field: ' + error.message);
        return ''; 
      }
    },
    goToUserInfo() {
      Logger.info('Navigating to user info page');
      this.$router.push('/user-info');
    },
    toggleOCRInput() {
      this.showOCRInput = !this.showOCRInput;
    },
    parseDateOfBirth(ocrDate) {
      const yearPrefix = ocrDate.substring(0, 2);
      const month = ocrDate.substring(2, 4);
      const day = ocrDate.substring(4, 6);

      const fullYear = parseInt(yearPrefix) >= 25 ? '19' + yearPrefix : '20' + yearPrefix;

      return `${fullYear}-${month}-${day}`;
    },

    parseExpiryDate(ocrDate) {
      const yearPrefix = ocrDate.substring(0, 2);
      const month = ocrDate.substring(2, 4);
      const day = ocrDate.substring(4, 6);

      return `20${yearPrefix}-${month}-${day}`;
    },
    handleFileUpload(event) {
      const imageFile = event.target.files[0];
      if (imageFile) {
        Tesseract.recognize(
          imageFile,
          'eng',
          {
            logger: m => console.log(m) // Logs progress
          }
        ).then(({ data: { text } }) => {
          this.handleOCRInput(text);
        }).catch(error => {
          this.errorMessage = 'OCR processing failed: ' + error.message;
          console.error('OCR processing failed:', error);
        });
      }
      this.toggleOCRInput();
    },
    handleOCRInput(ocrText) {
      const lines = ocrText.split('\n');

      const docNumber = lines[0].substring(6, 15); 
      const dob = lines[1].substring(0, 6); 
      const expiry = lines[1].substring(8, 14); 

      // Parse the dates
      const formattedDOB = this.parseDateOfBirth(dob);
      const formattedExpiry = this.parseExpiryDate(expiry);

      console.log(formattedDOB);
      console.log(formattedExpiry);
      // Set data model values
      this.DN = docNumber;
      this.DT = formattedDOB;
      this.GT = formattedExpiry;
    },

    formatDate(dateString) {
      const [year, month, day] = dateString.split('-');
      return year.substring(2) + month + day;
    },
    submitData() {
      Logger.info('Submitting data to server');
      const requestData = {
        DN: this.DN,
        DT: this.formatDate(this.DT),
        GT: this.formatDate(this.GT),
        PATH: this.folderPath,
        //PATH: 'C:/Users/elifl/Downloads',
        isEAC: false,
        isFaceMatch: false,
        isFaceMatchN: false,
      };
      axios.post(`${this.apiUrl}/api/read`, null, {
        params: requestData,
      })
      .then(response => {
        Logger.info('Data submitted successfully, preparing to send to another API');
        const info = response.data;
        this.TCKN = info.TCKN;

        const [surnamePart, namePart] = info.NOH.split('<<');
    
        this.surname = surnamePart.replace(/</g, ' ').trim();
        this.name = namePart.replace(/</g, ' ').trim();

        this.birthYear = info.Dogum_Tarihi.split('.')[2];
        console.log("name: " + this.name + " surname: " + this.surname + " TCKN: " + this.TCKN + " birth year: " + this.birthYear);
        this.sendDataToAnotherAPI(response.data);
      })
      .catch(error => {
        this.errorMessage = error.request.response;
        console.log(error);
        Logger.error('Error submitting data: ' + error.message);
        if (error.response) {
          Logger.error('Error details: ' + error.response.data);
        } 
        else {
          Logger.error('No response received');
        }
      });
    },
    sendDataToAnotherAPI(data) {
      Logger.info('Sending data to another API');
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
        Logger.debug(`Form data: ${key}: ${value}`);
      }

      axios.post(`http://192.168.1.158:9099/insert`, formData)
      .then(response => {
        Logger.info('Data sent to new API successfully');
        this.responseData = response.data;
      })
      .catch(error => {
        console.log(error)
        this.errorMessage = 'Error sending data to new API: ' + error.message;
        Logger.error('Error sending data to new API: ' + error.message);
        if (error.response) {
          Logger.error('Error details: ' + error.response.data);
        }
      });
    },
    sendDataSoap(){
      Logger.info('Sending data to backend');
      const formData = new FormData();

      formData.append('TCKimlikNo', this.TCKN || '');
      formData.append('Ad', this.name || '');
      formData.append('Soyad', this.surname || '');
      formData.append('DogumYili', this.birthYear || '');

      for (let [key, value] of formData.entries()) { 
        Logger.debug(`Form data: ${key}: ${value}`);
      }

      axios.post(`http://192.168.1.158:9099/soap_request`, formData)
      .then(response => {
        Logger.info('Data sent to new API successfully');
  
        this.soapResponse = response.data.result;
        console.log(response.data.result);
      })
      .catch(error => {
        this.errorMessage = error.request.response;
        console.log(error);
        Logger.error('Error sending data to new API: ' + error.message);
        if (error.response) {
          Logger.error('Error details: ' + error.response.data);
        }
      });
    },
    downloadLog() {
      Logger.downloadLogs();
    },
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

.btn.errorlog {
  position: fixed;
  top: 10px; 
  right: 10px; 
  padding: 5px 10px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px; 
  z-index: 1000; 
}

.btn.setApiUrl {
  position: fixed;
  top: 10px;
  right: 120px; 
  padding: 5px 10px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px; 
  z-index: 1000;
}

.btn.setFolder {
  position: fixed;
  top: 10px;
  right: 215px; 
  padding: 5px 10px;
  background-color: #FF9800; 
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px; 
  z-index: 1000;
}

.btn.errorlog:hover,
.btn.setApiUrl:hover,
.btn.setFolder:hover {
  opacity: 0.8;
}

.api-input-container {
  position: fixed;
  top: 50px;
  right: 10px;
  background-color: white;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.api-input-container label {
  margin-right: 5px;
}

.api-input-container input {
  padding: 5px;
  border-radius: 3px;
  border: 1px solid #ccc;
  margin-right: 5px;
}

.api-input-container .saveApiUrl {
  background-color: #2196F3;
  color: white;
  padding: 5px 10px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.api-input-container .saveApiUrl:hover {
  opacity: 0.8;
}

.path-input-container {
  position: fixed;
  top: 50px; 
  right: 10px;
  background-color: white;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.path-input-container label {
  margin-right: 5px;
}

.path-input-container input {
  padding: 5px;
  border-radius: 3px;
  border: 1px solid #ccc;
  margin-right: 5px;
}

.path-input-container .saveFolderPath {
  background-color: #2196F3;
  color: white;
  padding: 5px 10px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.path-input-container .saveFolderPath:hover {
  opacity: 0.8;
}

.input-group {
  margin-bottom: 15px;
}

input[type="text"],
input[type="date"] {
  width: 100%;
  max-width: 550px; 
  padding: 12px;
  font-size: 16px;
  margin-top: 5px;
  border-radius: 8px;
  border: 1px solid #ccc;
  transition: border-color 0.3s ease;
}

input[type="date"] {
  appearance: none;
  background-color: #fff;
  padding-left: 10px;
  position: relative;
  color: #555;
}

input[type="date"]::-webkit-calendar-picker-indicator {
  position: absolute;
  right: 10px;
  color: #555;
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

.btn.sendData {
  position: absolute;
  top: 10px;
  left: 10px; 
  padding: 5px 10px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
}

.btn.sendData:hover {
  opacity: 0.8;
}

.soap-response {
  position: absolute; 
  top: 50px;
  left: 10px; 
  padding: 5x 1px;
  background-color: #ccc;
  border-radius: 5px;
  font-size: 0.9em;
}

.btn.ocrButton {
  position: fixed;
  top: 10px;
  left: 150px;
  padding: 5px 10px;
  background-color: #607D8B;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
}

.btn.ocrButton:hover {
  opacity: 0.8;
}

.ocr-input-container {
  position: absolute;
  top: 50px;
  left: 120px;
  padding: 10px;
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

</style>

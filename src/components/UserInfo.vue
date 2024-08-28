<template>
    <div class="container">
      <h1>Show User Information</h1>
      <form @submit.prevent="fetchUserInfo" class="form">
        <div class="input-group">
          <input type="text" v-model="TCKN" placeholder="Enter TCKN" required />
        </div>
        <div class="button-group">
          <button type="submit" class="btn submit">Submit</button>
        </div>
      </form>
  
      <!-- Display the user data here -->
      <div v-if="userInfo" class="user-info">
        <p><strong>Name:</strong> {{ userInfo.Ad }}</p>
        <p><strong>Surname:</strong> {{ userInfo.Soyad }}</p>
        <p><strong>TCKN:</strong> {{ userInfo.TCKN }}</p>
        <p><strong>Date of birth:</strong> {{ userInfo.Dogum_Tarihi }}</p>
        <p><strong>Document number:</strong> {{ userInfo.Belge_Numarasi }}</p>
        <p><strong>Birth place:</strong> {{ userInfo.Dogum_Yeri }}</p>
        <p><strong>Expiry date:</strong> {{ userInfo.Son_Kullanim_Tarihi }}</p>
        <p><strong>Gender:</strong> {{ userInfo.Cinsiyet }}</p>
        <p><strong>Nationality:</strong> {{ userInfo.Uyruk }}</p>
        <p><strong>Other names:</strong> {{ userInfo.Other_names }}</p>
        <p><strong>NOH:</strong> {{ userInfo.NOH }}</p>
        <p><strong>POB:</strong> {{ userInfo.POB }}</p>
        <p><strong>Address:</strong> {{ userInfo.Adres }}</p>
        <div class="image-group">
        <div class="image-container">
            <div class="image-label">Image:</div>
            <img :src="'data:image/jpeg;base64,' + userInfo.IMAGE" alt="User Image" class="user-image" />
        </div>
        <div class="image-container">
            <div class="image-label">Current Image:</div>
            <img :src="'data:image/jpeg;base64,' + userInfo.Cam_Data" alt="Captured Image" class="user-image" />
        </div>
</div>

      </div>
  
      <div v-if="errorMessage" class="error">
        {{ errorMessage }}
      </div>
    </div>
  </template>
  
  <script>
  import axios from 'axios';
  import CryptoJS from 'crypto-js';
  
  export default {
    data() {
      return {
        TCKN: '',
        userInfo: null,
        errorMessage: '',
        encryptionKey: 'my-secret-key-12', // ENCRYOTION KEY
      };
    },
    methods: {
      encryptField(field) {
        try {
          const iv = CryptoJS.enc.Utf8.parse('my-fixed-iv-1234'); // Fixed IV, 16 bytes
          const key = CryptoJS.enc.Utf8.parse(this.encryptionKey);
  
          const encrypted = CryptoJS.AES.encrypt(field.toString(), key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7,
          });
  
          return encrypted.toString(); 
        } catch (error) {
          console.error('Error encrypting field:', error);
          return ''; 
        }
      },
      decryptField(encryptedField) {
        try {
          const iv = CryptoJS.enc.Utf8.parse('my-fixed-iv-1234'); // Fixed IV, 16 bytes
          const key = CryptoJS.enc.Utf8.parse(this.encryptionKey);
  
          const decrypted = CryptoJS.AES.decrypt(encryptedField, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7,
          });
  
          return decrypted.toString(CryptoJS.enc.Utf8); 
        } catch (error) {
          console.error('Error decrypting field:', error);
          return ''; 
        }
      },
      fetchUserInfo() {
        const encryptedTCKN = this.encryptField(this.TCKN); 
  
        axios
          .post('http://192.168.1.158:9099/get_user_info', { TCKN: encryptedTCKN })
          .then((response) => {

            this.userInfo = {
              Ad: this.decryptField(response.data.Ad),
              Soyad: this.decryptField(response.data.Soyad),
              TCKN: this.decryptField(response.data.TCKN),
              Dogum_Tarihi: this.decryptField(response.data.Dogum_Tarihi),
              Belge_Numarasi: this.decryptField(response.data.Belge_Numarasi),
              Dogum_Yeri: this.decryptField(response.data.Dogum_Yeri),
              Son_Kullanim_Tarihi: this.decryptField(response.data.Son_Kullanim_Tarihi),
              Cinsiyet: this.decryptField(response.data.Cinsiyet),
              Uyruk: this.decryptField(response.data.Uyruk),
              Other_names: this.decryptField(response.data.Other_names),
              NOH: this.decryptField(response.data.NOH),
              POB: this.decryptField(response.data.POB),
              Adres: this.decryptField(response.data.Adres),
              IMAGE: this.decryptField(response.data.IMAGE),
              Cam_Data: this.decryptField(response.data.Cam_Data),
            };
            this.errorMessage = ''; 
          })
          .catch((error) => {
            console.error('Error fetching user information:', error);
            this.userInfo = null;
            this.errorMessage = 'No user found with the given TCKN.';
          });
      },
    },
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
    box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
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
    font-size: 16px;
  }
  
  .button-group {
    display: flex;
    justify-content: center;
  }
  
  button.btn {
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;
    background-color: #26bb2b;
    color: black;
    transition: background-color 0.3s ease;
  }
  
  button.btn:hover {
    background-color: #45a049;
  }
  
  .user-info {
    margin-top: 20px;
    padding: 15px;
    border-radius: 5px;
    background-color: #e0f7fa;
    color: #00796b;
    font-size: 14px;
    box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .image-group {
  display: flex;
  justify-content: space-around;
  align-items: center;
  margin-top: 20px;
}

.image-container {
  text-align: center;
  margin: 0 10px;
}

.image-label {
  font-weight: bold;
  margin-bottom: 5px;
  font-size: 16px;
  color: #333;
}

.user-image {
  width: 150px;
  height: 150px;
  object-fit: cover;
  border: 2px solid #ccc;
  border-radius: 5px;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.3);
}

  .error {
    color: red;
    font-weight: bold;
    margin-top: 20px;
    text-align: center;
  }
  </style>
  
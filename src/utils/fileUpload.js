import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

export const pickDocumentForWeb = () => {
  return new Promise((resolve, reject) => {
    try {
      console.log('[FileUpload] Creating file input for web');
      if (typeof document === 'undefined') {
        console.error('[FileUpload] document is undefined - not in browser context');
        reject(new Error('document is not available'));
        return;
      }
      
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,application/pdf,.doc,.docx';
      input.multiple = false;
      input.style.display = 'none';
      
      input.onchange = (event) => {
        console.log('[FileUpload] File selected:', event.target.files[0]?.name);
        const file = event.target.files[0];
        if (file) {
          const fileObject = {
            uri: URL.createObjectURL(file),
            name: file.name,
            size: file.size,
            mimeType: file.type,
            file: file
          };
          document.body.removeChild(input);
          resolve({ canceled: false, assets: [fileObject] });
        } else {
          document.body.removeChild(input);
          resolve({ canceled: true });
        }
      };
      
      input.oncancel = () => {
        console.log('[FileUpload] File selection cancelled');
        document.body.removeChild(input);
        resolve({ canceled: true });
      };
      
      document.body.appendChild(input);
      console.log('[FileUpload] Triggering click on input');
      input.click();
    } catch (error) {
      console.error('[FileUpload] Error in pickDocumentForWeb:', error);
      reject(error);
    }
  });
};

export const pickDocument = async (options = {}) => {
  console.log('[FileUpload] pickDocument called, Platform.OS:', Platform.OS);
  if (Platform.OS === 'web') {
    return await pickDocumentForWeb();
  } else {
    return await DocumentPicker.getDocumentAsync({
      type: options.type || ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
      ...options
    });
  }
};

export const pickImageForWeb = () => {
  return new Promise((resolve, reject) => {
    try {
      console.log('[FileUpload] Creating image input for web');
      if (typeof document === 'undefined') {
        console.error('[FileUpload] document is undefined - not in browser context');
        reject(new Error('document is not available'));
        return;
      }
      
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      
      input.onchange = (event) => {
        console.log('[FileUpload] Image selected:', event.target.files[0]?.name);
        const file = event.target.files[0];
        if (file) {
          const fileObject = {
            uri: URL.createObjectURL(file),
            name: file.name,
            size: file.size,
            mimeType: file.type,
            file: file
          };
          document.body.removeChild(input);
          resolve({ canceled: false, assets: [fileObject] });
        } else {
          document.body.removeChild(input);
          resolve({ canceled: true });
        }
      };
      
      input.oncancel = () => {
        console.log('[FileUpload] Image selection cancelled');
        document.body.removeChild(input);
        resolve({ canceled: true });
      };
      
      document.body.appendChild(input);
      console.log('[FileUpload] Triggering click on image input');
      input.click();
    } catch (error) {
      console.error('[FileUpload] Error in pickImageForWeb:', error);
      reject(error);
    }
  });
};

export const pickImage = async (options = {}) => {
  console.log('[FileUpload] pickImage called (camera), Platform.OS:', Platform.OS);
  if (Platform.OS === 'web') {
    return await pickImageForWeb();
  } else {
    console.log('[FileUpload] Requesting camera permissions...');
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    console.log('[FileUpload] Camera permission result:', permissionResult);
    
    if (permissionResult.granted === false) {
      console.error('[FileUpload] Camera permission denied');
      throw new Error('Camera permission is required to take photos. Please enable camera access in your device settings.');
    }

    console.log('[FileUpload] Launching camera...');
    return await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      ...options
    });
  }
};

export const pickImageFromLibrary = async (options = {}) => {
  console.log('[FileUpload] pickImageFromLibrary called, Platform.OS:', Platform.OS);
  if (Platform.OS === 'web') {
    return await pickImageForWeb();
  } else {
    console.log('[FileUpload] Requesting media library permissions...');
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    console.log('[FileUpload] Media library permission result:', permissionResult);
    
    if (permissionResult.granted === false) {
      console.error('[FileUpload] Media library permission denied');
      throw new Error('Photo library permission is required to select photos. Please enable photo access in your device settings.');
    }

    console.log('[FileUpload] Launching image library...');
    return await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      allowsMultipleSelection: false,
      quality: 0.8,
      ...options
    });
  }
};

export const createFormDataFromFile = (fileAsset, fieldName = 'file', additionalData = {}) => {
  const formData = new FormData();
  
  if (Platform.OS === 'web' && fileAsset.file) {
    formData.append(fieldName, fileAsset.file);
  } else {
    const file = {
      uri: fileAsset.uri,
      type: fileAsset.mimeType || 'application/octet-stream',
      name: fileAsset.name || `upload_${Date.now()}.${fileAsset.mimeType?.split('/')[1] || 'jpg'}`
    };
    formData.append(fieldName, file);
  }
  
  Object.keys(additionalData).forEach(key => {
    formData.append(key, additionalData[key]);
  });
  
  return formData;
};

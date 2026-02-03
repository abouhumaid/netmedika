import { useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import CustomAlert from '../components/CustomAlert';
import { TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useForm } from "react-hook-form";
import CustomInput from '../components/CustomInput';
import AuthLayout from '../components/AuthLayout';
import { styles as authStyles } from '../styles/authStyles';
import { PharmacyColors } from '../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

type FormData = {
  email: string;
  password: string;
};

const Login = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (formData: FormData) => {
    setLoading(true);
    const { email, password } = formData;
    try {
      const response = await fetch('http://3.216.23.204:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.access_token) {
        await AsyncStorage.setItem('userToken', data.access_token);
        const savedToken = await AsyncStorage.getItem('userToken');
        console.log('Login successful:');
        router.push('/(tabs)/');
        return data;
      } else {
        setAlertType('error');
        setAlertTitle('Login Failed');
        setAlertMessage(data.detail || 'Invalid credentials');
        setAlertVisible(true);
        
        
      }
    } catch (error) {
      console.error('Login error:', error);
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage('Network request failed');
      setAlertVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthLayout
        title="Welcome Back"
        subtitle="Sign in to continue"
        submitText="Sign In"
        onSubmit={handleSubmit(onSubmit)}
        loading={loading}
        footerText="Don't have an account? "
        footerLinkText="Sign Up"
        footerLinkHref="/register"
      >
        <CustomInput
          name="email"
          control={control}
          label="Email"
          validationType="email"
          keyboardType="email-address"
          left={<TextInput.Icon icon="email" color={PharmacyColors.accent} />}
        />

        <CustomInput
          name="password"
          control={control}
          label="Password"
          validationType="password"
          secureTextEntry={!showPassword}
          right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword(!showPassword)} color={PharmacyColors.gray} />}
          left={<TextInput.Icon icon="lock" color={PharmacyColors.accent} />}
        />

        <TouchableOpacity style={authStyles.forgotPassword} onPress={() => {}}>
          <Text style={authStyles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>
      </AuthLayout>
      <CustomAlert
        visible={alertVisible}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        confirmText="OK"
        onConfirm={() => {
          setAlertVisible(false);
          if (alertType === 'success') {
            router.replace('/');
          }
        }}
      />
    </>
  );
};

export default Login;

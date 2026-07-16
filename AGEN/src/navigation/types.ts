export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  OtpVerification: {
    email: string;
    mode: "login" | "signup" | "recovery";
  };
};

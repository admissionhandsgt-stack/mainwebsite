import { useContactInfo } from './useContactInfo';

export const useCTA = () => {
  const { contactInfo } = useContactInfo();
  
  const getPhone = () => contactInfo?.phone_number || "+919220626002";
  const getWhatsapp = () => contactInfo?.whatsapp_number || "+919220626002";

  return {
    whatsapp: (message?: string) => {
      const text = encodeURIComponent(message || "Hi AdmissionHands, I need guidance for NEET counselling & medical admission 2026");
      window.open(`https://wa.me/${getWhatsapp().replace(/[+\s-]/g, '')}?text=${text}`, "_blank");
    },
    call: () => {
      window.location.href = `tel:${getPhone()}`;
    },
    counselling: () => {
      const text = encodeURIComponent("Hi, I want expert guidance for NEET counselling & medical admission in India 2026");
      window.open(`https://wa.me/${getWhatsapp().replace(/[+\s-]/g, '')}?text=${text}`, "_blank");
    },
    explore: () => {
      window.location.href = "/colleges";
    }
  };
};

import { useContactInfo } from './useContactInfo';

export const useCTA = () => {
  const { contactInfo } = useContactInfo();
  
  const getPhone = () => contactInfo?.phone_number || "+919310301949";
  const getWhatsapp = () => contactInfo?.whatsapp_number || "+919310301949";

  return {
    whatsapp: (message?: string) => {
      const text = encodeURIComponent(message || "Hi, I need MBBS admission guidance for 2026");
      window.open(`https://wa.me/${getWhatsapp().replace(/[+\s-]/g, '')}?text=${text}`, "_blank");
    },
    call: () => {
      window.location.href = `tel:${getPhone()}`;
    },
    counselling: () => {
      const text = encodeURIComponent("Hi, I want expert guidance for MBBS/PG admission in India 2026");
      window.open(`https://wa.me/${getWhatsapp().replace(/[+\s-]/g, '')}?text=${text}`, "_blank");
    },
    explore: () => {
      window.location.href = "/colleges";
    }
  };
};

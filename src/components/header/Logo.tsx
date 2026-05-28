import Link from 'next/link';
import Image from 'next/image';

const Logo = () => {
  return (
    <Link href="/" className="flex items-center">
      <div className="transition-transform duration-300 hover:-translate-y-0.5">
        <Image 
          src="/assets/images/logos/logo-4k.avif" 
          alt="Admission Hands Logo" 
          width={180} 
          height={60} 
          className="object-contain w-auto h-10 sm:h-12 md:h-14"
          priority
        />
      </div>
    </Link>
  );
};

export default Logo;

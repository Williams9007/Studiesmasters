import React from "react";
import {
  FaBookOpen,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaFacebookF,
  FaTwitter,
  FaInstagram,
} from "react-icons/fa";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { useNavigate } from "react-router-dom";
import ChatBotWidget from "../components/ChatBotWidget";

const LandingPage = () => {
  const navigate = useNavigate();

  const handleRoleClick = (role) => {
    navigate(`/register-course/${role.toLowerCase()}`);
  };

  const handleLoginClick = () => {
    navigate("/login");
  };

  const packages = [
    {
      title: "Extra Classes",
      description: "Enhance your learning after school.",
      img: "https://media.istockphoto.com/id/2060534013/photo/after-school-tutoring.webp?a=1&b=1&s=612x612&w=0&k=20&c=98ns3AW5Xvzpldy5VjqJNIeDgwi3tFpBoDOT57nm3vY=",
    },
    {
      title: "Home School",
      description: "Private lessons at home.",
      img: "https://media.istockphoto.com/id/1327099264/photo/grandfather-is-teaching-lessons-to-his-teenage-grandson-at-home.webp?a=1&b=1&s=612x612&w=0&k=20&c=lib213WlEWpeWuy7TjFsgboyrEIjH6RwJ04OE1HbDqY=",
    },
    {
      title: "Vacation Classes",
      description: "Learn and have fun during vacations.",
      img: "https://media.istockphoto.com/id/834369132/photo/colourful-children-schoolbags-outdoors-on-the-field.webp?a=1&b=1&s=612x612&w=0&k=20&c=uSAb3IuPbiLIT7n0q3LVOV7fzuyNv-o1OSLRLgevjHs=",
    },
    {
      title: "One on One Classes",
      description: "Personalized teaching for you.",
      img: "https://media.istockphoto.com/id/1292825155/photo/youre-the-best-teacher.webp?a=1&b=1&s=612x612&w=0&k=20&c=8j_Lr9GWaVogBqQVkzrd-mm4ZUIbN1-09hCNriO7A1o=",
    },
  ];

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2500,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 2 } },
      { breakpoint: 640, settings: { slidesToShow: 1 } },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-cyan-100 text-gray-900">
      <ChatBotWidget />

      {/* Hero Section */}
      <section className="relative h-screen">
        <img
          src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1920&q=80"
          alt="Hero"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 px-4">
          <div className="text-center max-w-lg">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-2">
              Welcome to EduConnectt
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-white/90">
              Connecting students and teachers for meaningful learning.
            </p>
          </div>
        </div>
        <div className="absolute top-4 left-4 flex items-center gap-2 text-2xl sm:text-3xl font-bold text-white">
          <FaBookOpen className="text-yellow-400 animate-pulse" />
          <span className="text-primary">EduConnectt</span>
        </div>
        <button
          onClick={handleLoginClick}
          className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition text-sm sm:text-base"
        >
          Login
        </button>
      </section>

      {/* About Us */}
      <section className="py-12 px-4 sm:px-8 md:px-20 bg-cyan-50 text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4">About Us</h2>
        <p className="text-sm sm:text-base md:text-lg max-w-3xl mx-auto mb-4">
          EduConnectt is an online platform that connects teachers and students for virtual after-school classes. We offer both GES and Cambridge curricula.
          EduConnectt is designed for parents and guardians who want to register their children for online after-school classes. Our platform allows educators to focus on teaching, providing parents with a good return on their investment. We also offer easy access to children's academic performance and mitigate issues associated with traditional home tuition. Additionally, students can enhance their tech skills.
        </p>
        <h3 className="text-gray-700 text-base sm:text-lg md:text-xl font-medium">
          Register today for tracked results!
        </h3>
      </section>

      {/* Packages Section */}
      <section className="py-12 px-4 sm:px-8 md:px-20 bg-gradient-to-r from-cyan-100 to-blue-50">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8">
          Our Packages
        </h2>
        <Slider {...settings}>
          {packages.map((pkg) => (
            <div key={pkg.title} className="p-2 flex justify-center">
              <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:scale-105 transform transition-transform duration-300 w-56 sm:w-64 md:w-72">
                <img src={pkg.img} alt={pkg.title} className="w-full h-40 object-cover" />
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-1">{pkg.title}</h3>
                  <p className="text-gray-600 text-sm">{pkg.description}</p>
                </div>
              </div>
            </div>
          ))}
        </Slider>
      </section>

      {/* Role Selection */}
      <section className="py-12 px-4 sm:px-8 md:px-20 bg-gradient-to-r from-blue-100 to-cyan-200">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8">
          Choose Your Role
        </h2>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-6 sm:gap-8">
          {[
            {
              name: "Student",
              icon: <FaUserGraduate size={40} className="text-blue-600" />,
            },
            {
              name: "Teacher",
              icon: <FaChalkboardTeacher size={40} className="text-blue-600" />,
            },
          ].map((role) => (
            <div
              key={role.name}
              onClick={() => handleRoleClick(role.name)}
              className="cursor-pointer bg-white rounded-xl shadow-lg p-6 sm:p-8 flex flex-col items-center justify-center gap-2 sm:gap-4 transform transition-transform duration-300 hover:scale-105 hover:shadow-2xl w-56 sm:w-64"
            >
              {role.icon}
              <h3 className="text-lg sm:text-xl font-semibold">{role.name}</h3>
              <p className="text-center text-gray-600 text-sm sm:text-base">
                Click to register as a {role.name.toLowerCase()}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 sm:py-10 bg-gray-800 text-white text-center">
        <p className="mb-4">Follow us on social media</p>
        <div className="flex justify-center gap-4 sm:gap-6 text-xl sm:text-2xl">
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500">
            <FaFacebookF />
          </a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-green-400">
            <FaTwitter />
          </a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-pink-500">
            <FaInstagram />
          </a>
        </div>
        <p className="text-sm text-gray-500 mt-4">© 2025 EduConnect. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;

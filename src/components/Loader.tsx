import { motion } from 'motion/react';
import { Salad } from 'lucide-react';

export default function Loader() {
  return (
    <div className="fixed inset-0 bg-[#FAFAF8] z-[9999] flex flex-col items-center justify-center overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative"
      >
        {/* Pulsing ring */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.1, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 bg-orange-100 rounded-full scale-150 blur-xl"
        />
        
        {/* Main Icon container */}
        <div className="relative w-24 h-24 bg-white rounded-full flex items-center justify-center border border-orange-50 shadow-sm shadow-orange-100/50">
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 0],
              y: [0, -4, 0]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Salad size={40} className="text-orange-600" />
          </motion.div>
        </div>

        {/* Loading text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-center"
        >
          <h2 className="text-lg font-serif font-bold text-gray-900 tracking-tight">DapurSehat</h2>
          <div className="flex items-center justify-center gap-1 mt-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
                className="w-1.5 h-1.5 bg-orange-600 rounded-full"
              />
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Subtle background elements */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-orange-50/30 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-emerald-50/30 rounded-full blur-3xl" />
    </div>
  );
}

export interface PredefinedPlatform {
  name: string;
  color: string;
  icon: string;
  category: 'Food Delivery' | 'Quick Commerce' | 'Bike Taxi / Rides' | 'Logistics & Courier';
  categoryHi: 'फूड डिलीवरी' | 'क्विक कॉमर्स' | 'बाइक टैक्सी / राइड' | 'पार्सल व कूरियर';
}

export const TOP_PREDEFINED_PLATFORMS: PredefinedPlatform[] = [
  { name: 'Zomato', color: '#CB202D', icon: 'Z', category: 'Food Delivery', categoryHi: 'फूड डिलीवरी' },
  { name: 'Swiggy', color: '#FC8019', icon: 'S', category: 'Food Delivery', categoryHi: 'फूड डिलीवरी' },
  { name: 'Blinkit', color: '#F8CB46', icon: 'B', category: 'Quick Commerce', categoryHi: 'क्विक कॉमर्स' },
  { name: 'Rapido', color: '#FFCC00', icon: 'R', category: 'Bike Taxi / Rides', categoryHi: 'बाइक टैक्सी / राइड' },
  { name: 'Zepto', color: '#8B5CF6', icon: 'Z', category: 'Quick Commerce', categoryHi: 'क्विक कॉमर्स' },
  { name: 'Uber', color: '#000000', icon: 'U', category: 'Bike Taxi / Rides', categoryHi: 'बाइक टैक्सी / राइड' },
  { name: 'Shadowfax', color: '#E0533C', icon: 'S', category: 'Logistics & Courier', categoryHi: 'पार्सल व कूरियर' },
  { name: 'Porter', color: '#1D4ED8', icon: 'P', category: 'Logistics & Courier', categoryHi: 'पार्सल व कूरियर' },
  { name: 'Dunzo', color: '#00BFA5', icon: 'D', category: 'Quick Commerce', categoryHi: 'क्विक कॉमर्स' },
  { name: 'Ola', color: '#65A30D', icon: 'O', category: 'Bike Taxi / Rides', categoryHi: 'बाइक टैक्सी / राइड' },
  { name: 'BigBasket', color: '#E11D48', icon: 'B', category: 'Quick Commerce', categoryHi: 'क्विक कॉमर्स' },
  { name: 'Amazon Flex', color: '#FF9900', icon: 'A', category: 'Logistics & Courier', categoryHi: 'पार्सल व कूरियर' },
];

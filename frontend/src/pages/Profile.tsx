import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { formatSizeToIndian } from '../utils/sizeHelper'
import { LogOut, Package, Mail, User, Shield, MapPin, Key, Plus, Trash2, Edit3, Loader2, Check, X, Phone, Printer } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useToastStore } from '../store/useToastStore'
import HeicImage from '../components/HeicImage'
import { isHeicFile, convertHeicToWebp } from '../utils/imageUpload'

interface Order {
  id: number;
  order_number: string;
  total_amount: number;
  order_status: string;
  payment_status: string;
  created_at: string;
  items?: { name: string; image: string; size: string; color?: string; qty: number; price: number }[];
}

interface Address {
  id: number;
  label: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  is_default: number;
}

export default function Profile() {
  const { user, token, logout, login } = useAuthStore()
  const { showToast } = useToastStore()
  const navigate = useNavigate()

  // Tab State: 'profile', 'addresses', 'orders'
  const [activeTab, setActiveTab] = useState<'profile' | 'addresses' | 'orders'>('profile')

  // Lists & Loaders
  const [orders, setOrders] = useState<Order[]>([])
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)

  // Edit Profile Form State
  const [firstName, setFirstName] = useState(user?.firstName || '')
  const [lastName, setLastName] = useState(user?.lastName || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [updatingProfile, setUpdatingProfile] = useState(false)

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)

  // Change Email Form State
  const [newEmail, setNewEmail] = useState('')
  const [emailOtp, setEmailOtp] = useState('')
  const [emailOtpSent, setEmailOtpSent] = useState(false)
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false)
  const [verifyingEmailOtp, setVerifyingEmailOtp] = useState(false)

  // Address Dialog Modal State
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const [addressLabel, setAddressLabel] = useState('Home')
  const [addressName, setAddressName] = useState('')
  const [addressPhone, setAddressPhone] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [addressCity, setAddressCity] = useState('')
  const [addressState, setAddressState] = useState('')
  const [addressPincode, setAddressPincode] = useState('')
  const [addressDefault, setAddressDefault] = useState(false)
  const [savingAddress, setSavingAddress] = useState(false)

  // Exchanges state
  const [exchanges, setExchanges] = useState<any[]>([])
  const [exchangeModalOpen, setExchangeModalOpen] = useState(false)
  const [selectedOrderForExchange, setSelectedOrderForExchange] = useState<any | null>(null)
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0)
  const [exchangeType, setExchangeType] = useState<'same_variant' | 'same_price'>('same_variant')
  
  const [samePriceProducts, setSamePriceProducts] = useState<any[]>([])
  const [selectedExchangeProduct, setSelectedExchangeProduct] = useState<any | null>(null)
  
  const [exchangeSizes, setExchangeSizes] = useState<string[]>([])
  const [exchangeColors, setExchangeColors] = useState<string[]>([])
  const [selectedExchangeSize, setSelectedExchangeSize] = useState('')
  const [selectedExchangeColor, setSelectedExchangeColor] = useState('')
  
  const [exchangeFiles, setExchangeFiles] = useState<(File | null)[]>([null, null, null])
  const [exchangeReason, setExchangeReason] = useState('Size mismatch / fit issue')
  const [exchangeDescription, setExchangeDescription] = useState('')
  const [submittingExchange, setSubmittingExchange] = useState(false)
  
  // Order details modal state
  const [orderDetailsModalOpen, setOrderDetailsModalOpen] = useState(false)
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<any | null>(null)

  const getOrderExchangeStatus = (orderId: number) => {
    const ex = exchanges.find((e: any) => e.order_id === orderId)
    return ex ? ex.status : null
  }

  const loadExchangeProductDetails = async (productId: number, priceRupees: number) => {
    try {
      const [res, altRes] = await Promise.all([
        fetch(`/api/products/${productId}`),
        fetch(`/api/products?min_price=${priceRupees}&max_price=${priceRupees}&limit=100`)
      ])
      const [data, altData] = await Promise.all([
        res.json(),
        altRes.json()
      ])

      if (data.success && data.data?.product) {
        const prod = data.data.product
        setExchangeSizes(prod.sizes || [])
        setExchangeColors(prod.colors || [])
        setSelectedExchangeSize(prod.sizes?.[0] || '')
        setSelectedExchangeColor(prod.colors?.[0] || 'Default')
        setSelectedExchangeProduct(prod)
      }
      
      if (altData.success && altData.data) {
        setSamePriceProducts(altData.data)
      } else {
        setSamePriceProducts([])
      }
    } catch (e) {
      console.error('Failed to load exchange product details:', e)
    }
  }

  const handleOpenExchange = async (order: any) => {
    setSelectedOrderForExchange(order)
    setSelectedItemIndex(0)
    setExchangeType('same_variant')
    setExchangeReason('Size mismatch / fit issue')
    setExchangeDescription('')
    setExchangeFiles([null, null, null])
    
    const firstItem = order.items?.[0]
    if (firstItem) {
      await loadExchangeProductDetails(firstItem.product_id, firstItem.price / 100)
    }
    setExchangeModalOpen(true)
  }

  const handleSelectExchangeItem = async (index: number) => {
    setSelectedItemIndex(index)
    const item = selectedOrderForExchange.items[index]
    if (item) {
      await loadExchangeProductDetails(item.product_id, item.price / 100)
    }
  }

  const handleSelectExchangeProduct = async (prodId: number) => {
    try {
      const res = await fetch(`/api/products/${prodId}`)
      const data = await res.json()
      if (data.success && data.data?.product) {
        const prod = data.data.product
        setSelectedExchangeProduct(prod)
        setExchangeSizes(prod.sizes || [])
        setExchangeColors(prod.colors || [])
        setSelectedExchangeSize(prod.sizes?.[0] || '')
        setSelectedExchangeColor(prod.colors?.[0] || 'Default')
      }
    } catch (e) {
      console.error('Failed to load alternate product details:', e)
    }
  }

  const handleSelectExchangeColor = async (color: string) => {
    setSelectedExchangeColor(color)
    if (selectedExchangeProduct?.color_to_id?.[color]) {
      const targetId = selectedExchangeProduct.color_to_id[color]
      if (targetId !== selectedExchangeProduct.id) {
        try {
          const res = await fetch(`/api/products/${targetId}`)
          const data = await res.json()
          if (data.success && data.data?.product) {
            const prod = data.data.product
            setSelectedExchangeProduct(prod)
            setExchangeSizes(prod.sizes || [])
            setSelectedExchangeSize(prod.sizes?.[0] || '')
          }
        } catch (e) {
          console.error('Failed to fetch new color variant:', e)
        }
      }
    }
  }

  const handleFileChange = (index: number, file: File | null) => {
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('error', 'File Too Large', 'Each image must be under 5MB.')
        return
      }
    }
    setExchangeFiles(prev => {
      const copy = [...prev]
      copy[index] = file
      return copy
    })
  }

  const handleSubmitExchange = async (e: React.FormEvent) => {
    e.preventDefault()
    const filesToUpload = exchangeFiles.filter(f => f !== null) as File[]
    if (filesToUpload.length !== 3) {
      showToast('error', 'Photos Required', 'Please upload exactly 3 images of the product.')
      return
    }
    
    setSubmittingExchange(true)
    const convertToWebP = (file: File): Promise<File> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              canvas.toBlob((blob) => {
                if (blob) {
                  const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                    type: 'image/webp'
                  });
                  resolve(newFile);
                } else {
                  resolve(file);
                }
              }, 'image/webp', 0.85);
            } else {
              resolve(file);
            }
          };
          img.onerror = () => resolve(file);
          img.src = event.target?.result as string;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
      });
    };

    try {
      const uploadedUrls: string[] = []
      for (let file of filesToUpload) {
        if (isHeicFile(file)) {
          try {
            file = await convertHeicToWebp(file);
          } catch (err) {
            console.error('HEIC conversion failed:', err);
          }
        }
        const isGif = file.name.toLowerCase().endsWith('.gif') || file.type === 'image/gif';
        const isWebp = file.name.toLowerCase().endsWith('.webp') || file.type === 'image/webp';
        const isAvif = file.name.toLowerCase().endsWith('.avif') || file.type === 'image/avif';
        if (!isGif && !isWebp && !isAvif) {
          file = await convertToWebP(file);
        }

        const formData = new FormData()
        formData.append('file', file)
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        })
        const uploadData = await uploadRes.json()
        if (uploadData.success && uploadData.data?.url) {
          uploadedUrls.push(uploadData.data.url)
        } else {
          throw new Error(uploadData.error || 'Failed to upload photo')
        }
      }
      
      const itemToExchange = selectedOrderForExchange.items[selectedItemIndex]
      const exchangeData = {
        order_id: selectedOrderForExchange.id,
        reason: exchangeReason,
        description: exchangeDescription,
        images: uploadedUrls,
        items: [
          {
            product_id: itemToExchange.product_id,
            size: itemToExchange.size,
            color: itemToExchange.color,
            qty: 1,
            reason: exchangeReason,
            exchange_to_product_id: selectedExchangeProduct?.id || itemToExchange.product_id,
            exchange_to_size: selectedExchangeSize,
            exchange_to_color: selectedExchangeColor
          }
        ]
      }
      
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(exchangeData)
      })
      const data = await res.json()
      if (data.success) {
        showToast('success', 'Exchange Submitted', 'Your exchange request has been submitted successfully.')
        setExchangeModalOpen(false)
        
        // Refresh exchanges
        const exRes = await fetch('/api/returns', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const exData = await exRes.json()
        if (exData.success) {
          setExchanges(exData.data)
        }
      } else {
        showToast('error', 'Submission Failed', data.error || 'Could not register exchange.')
      }
    } catch (err: any) {
      showToast('error', 'Execution Error', err.message || 'Error occurred while processing.')
    } finally {
      setSubmittingExchange(false)
    }
  }

  const printInvoiceWindow = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const itemsList = (order.items || []).map((item: any) => `
      <div style="margin-bottom: 6px; border-bottom: 1px dashed #eee; padding-bottom: 4px;">
        <div style="font-weight: bold; font-size: 11px;">${item.product_name}</div>
        <div style="display: flex; justify-content: space-between; font-size: 10px; color: #444; margin-top: 2px;">
          <span>Size: \${formatSizeToIndian(item.size)} &middot; Qty: \${item.quantity} &middot; @ ₹\${(item.price / 100).toFixed(0)}</span>
          <span style="font-weight: bold; color: #000;">₹${((item.price * item.quantity) / 100).toFixed(0)}</span>
        </div>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${order.order_number}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #000;
              margin: 0;
              padding: 12px;
              max-width: 290px;
              font-size: 11px;
              background-color: #fff;
            }
            .center { text-align: center; }
            .logo { height: 40px; margin-bottom: 6px; filter: grayscale(100%); }
            .shop-name { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
            .shop-addr { font-size: 9px; color: #444; line-height: 1.3; margin-top: 3px; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .details-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 10px; }
            .details-label { color: #555; }
            .details-val { font-weight: 500; }
            .section-title { font-weight: bold; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #444; margin-bottom: 6px; }
            .bill-totals { margin-top: 8px; font-size: 11px; }
            .bill-totals div { display: flex; justify-content: space-between; margin-bottom: 3px; }
            .grand-total { font-size: 13px; font-weight: 700; border-top: 1px dashed #000; padding-top: 6px; margin-top: 6px; }
            .footer-msg { text-align: center; font-size: 9px; color: #555; line-height: 1.3; margin-top: 16px; border-top: 1px dashed #000; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="center">
            <img class="logo" src="https://heelsup.in/logo.png" onerror="this.src='/logo.png'; this.onerror=null;" alt="HeelsUp" /><br/>
            <span class="shop-name">HeelsUp Boutique</span>
            <div class="shop-addr">
              1st B Rd, near Mahaveer Mega Mart,<br/>
              opposite Little Champ, Sardarpura,<br/>
              Jodhpur, Rajasthan 342001<br/>
              Phone: 078914 70935
            </div>
          </div>

          <div class="divider"></div>

          <div class="section-title">Order Details</div>
          <div class="details-row">
            <span class="details-label">Receipt No:</span>
            <span class="details-val">${order.order_number}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Date:</span>
            <span class="details-val">${new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Payment Mode:</span>
            <span class="details-val" style="text-transform: uppercase;">${order.payment_method}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Customer Name:</span>
            <span class="details-val">${order.customer_name}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Contact:</span>
            <span class="details-val">${order.customer_phone}</span>
          </div>

          <div class="divider"></div>

          <div class="section-title">Items Ordered</div>
          <div style="margin-top: 4px;">
            ${itemsList}
          </div>

          <div class="bill-totals">
            <div>
              <span>Subtotal:</span>
              <span>₹${(order.subtotal_amount / 100).toFixed(0)}</span>
            </div>
            ${order.discount_amount > 0 ? `
            <div style="color: #b91c1c;">
              <span>Discount Applied:</span>
              <span>-₹${(order.discount_amount / 100).toFixed(0)}</span>
            </div>` : ''}
            <div>
              <span>Shipping Fee:</span>
              <span>₹${(order.shipping_amount / 100).toFixed(0)}</span>
            </div>
            <div class="grand-total">
              <span>GRAND TOTAL:</span>
              <span>₹${(order.total_amount / 100).toFixed(0)}</span>
            </div>
          </div>

          <div class="footer-msg">
            Thank you for shopping with HeelsUp!<br/>
            Visit heelsup.in/returns for easy exchanges.<br/>
            Step out in confidence!
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();

    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handleDownloadInvoice = async (orderId: number) => {
    try {
      const res = await fetch(`/api/orders/my/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        printInvoiceWindow(data.data);
      } else {
        showToast('error', 'Retrieval Failed', 'Could not fetch detailed order summary.');
      }
    } catch {
      showToast('error', 'Connection Error', 'Could not establish connection to order registry.');
    }
  };

  // Auth redirect
  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }

    async function loadData() {
      setLoading(true)
      try {
        const headers = { 'Authorization': `Bearer ${token}` }
        const [ordRes, addrRes, exRes] = await Promise.all([
          fetch('/api/orders/my', { headers }),
          fetch('/api/addresses', { headers }),
          fetch('/api/returns', { headers })
        ])
        
        const [ordData, addrData, exData] = await Promise.all([
          ordRes.json(),
          addrRes.json(),
          exRes.json()
        ])

        if (ordData.success) {
          setOrders(ordData.data)
        }
        if (addrData.success) {
          setAddresses(addrData.data)
        }
        if (exData.success) {
          setExchanges(exData.data)
        }
      } catch (e) {
        console.error('Failed to load profile data:', e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [token])

  // Sync profile edits
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '')
      setLastName(user.lastName || '')
      setPhone(user.phone || '')
    }
  }, [user])

  const handleLogout = () => {
    logout()
    showToast('info', 'Logged Out', 'You have logged out of your account.')
    navigate('/')
  }

  // Edit Profile Details Submit
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName) {
      showToast('warning', 'Name required', 'First Name is required.')
      return
    }
    setUpdatingProfile(true)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ firstName, lastName, phone })
      })
      const data = await res.json()
      if (data.success && data.data?.user) {
        // update useAuthStore user info
        login(token!, data.data.user)
        showToast('success', 'Profile Updated', 'Your contact details have been updated.')
      } else {
        showToast('error', 'Update Failed', data.error || 'Failed to update details.')
      }
    } catch {
      showToast('error', 'Network Error', 'Could not save profile details.')
    } finally {
      setUpdatingProfile(false)
    }
  }

  // Change Password Submit
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('warning', 'Passwords Required', 'Please fill in all the password fields.')
      return
    }
    if (newPassword.length < 8) {
      showToast('warning', 'Weak Password', 'New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      showToast('warning', 'Mismatch', 'Passwords do not match.')
      return
    }
    setUpdatingPassword(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      })
      const data = await res.json()
      if (data.success) {
        showToast('success', 'Password Changed', 'Your password has been successfully updated.')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        showToast('error', 'Change Failed', data.error || 'Current password may be incorrect.')
      }
    } catch {
      showToast('error', 'Network Error', 'Could not change password.')
    } finally {
      setUpdatingPassword(false)
    }
  }

  // Send Email Update Verification OTP
  const handleSendEmailOtp = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      showToast('warning', 'Valid Email Required', 'Please enter a valid email address.')
      return
    }
    setSendingEmailOtp(true)
    try {
      const res = await fetch('/api/auth/change-email-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: newEmail })
      })
      const data = await res.json()
      if (data.success) {
        setEmailOtpSent(true)
        showToast('success', 'OTP Sent', `We sent a verification code to ${newEmail}.`)
      } else {
        showToast('error', 'Request Failed', data.error || 'Failed to send OTP.')
      }
    } catch {
      showToast('error', 'Network Error', 'Could not send verification email.')
    } finally {
      setSendingEmailOtp(false)
    }
  }

  // Verify Email Update Verification OTP
  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailOtp || emailOtp.length !== 6) {
      showToast('warning', 'OTP Required', 'Please enter the 6-digit OTP code.')
      return
    }
    setVerifyingEmailOtp(true)
    try {
      const res = await fetch('/api/auth/change-email-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: newEmail, otp: emailOtp })
      })
      const data = await res.json()
      if (data.success && data.data?.token) {
        // save new token and updated user
        login(data.data.token, data.data.user)
        setEmailOtpSent(false)
        setNewEmail('')
        setEmailOtp('')
        showToast('success', 'Email Updated! 🎉', `Your login email is now updated to ${data.data.user.email}.`)
      } else {
        showToast('error', 'Verification Failed', data.error || 'Invalid or expired OTP.')
      }
    } catch {
      showToast('error', 'Network Error', 'Could not verify OTP.')
    } finally {
      setVerifyingEmailOtp(false)
    }
  }

  // Open Add/Edit Address Modal
  const openAddressModal = (addr: Address | null = null) => {
    setEditingAddress(addr)
    if (addr) {
      setAddressLabel(addr.label)
      setAddressName(addr.name)
      setAddressPhone(addr.phone)
      setAddressLine1(addr.line1)
      setAddressLine2(addr.line2 || '')
      setAddressCity(addr.city)
      setAddressState(addr.state)
      setAddressPincode(addr.pincode)
      setAddressDefault(addr.is_default === 1)
    } else {
      setAddressLabel('Home')
      setAddressName(user?.name || '')
      setAddressPhone(user?.phone || '')
      setAddressLine1('')
      setAddressLine2('')
      setAddressCity('')
      setAddressState('')
      setAddressPincode('')
      setAddressDefault(addresses.length === 0) // default if first address
    }
    setAddressModalOpen(true)
  }

  // Save/Edit Address Submit
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addressName || !addressPhone || !addressLine1 || !addressCity || !addressState || !addressPincode) {
      showToast('warning', 'Missing details', 'Please fill in all the required address fields.')
      return
    }

    setSavingAddress(true)
    const url = editingAddress ? `/api/addresses/${editingAddress.id}` : '/api/addresses'
    const method = editingAddress ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          label: addressLabel,
          name: addressName,
          phone: addressPhone,
          line1: addressLine1,
          line2: addressLine2 || null,
          city: addressCity,
          state: addressState,
          pincode: addressPincode,
          is_default: addressDefault
        })
      })
      const data = await res.json()
      if (data.success) {
        // Refresh address list
        const refreshed = await fetch('/api/addresses', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json())
        if (refreshed.success) setAddresses(refreshed.data)

        showToast('success', editingAddress ? 'Address Updated' : 'Address Saved', 'Address has been successfully recorded.')
        setAddressModalOpen(false)
      } else {
        showToast('error', 'Action Failed', data.error || 'Failed to save address.')
      }
    } catch {
      showToast('error', 'Network Error', 'Could not communicate with server.')
    } finally {
      setSavingAddress(false)
    }
  }

  // Delete Address
  const handleDeleteAddress = async (id: number) => {
    if (!confirm('Are you sure you want to delete this address?')) return
    try {
      const res = await fetch(`/api/addresses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setAddresses(prev => prev.filter(a => a.id !== id))
        showToast('success', 'Address Removed', 'The address has been successfully deleted.')
      } else {
        showToast('error', 'Purge Failed', data.error || 'Failed to delete address.')
      }
    } catch {
      showToast('error', 'Network Error', 'Could not delete address.')
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 md:px-8 mt-24 animate-pulse space-y-6">
        <div className="h-10 bg-gray-100 rounded w-1/4" />
        <div className="h-40 bg-gray-100 rounded w-full" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-8 mt-12 min-h-[75vh] select-none relative pb-16">
      
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[45%] bg-[#ead2ae]/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[5%] right-[-5%] w-[45%] h-[45%] bg-[#d4456b]/5 rounded-full blur-[130px] pointer-events-none" />

      {/* Main Grid Profile Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
        
        {/* Left Side: Profile Tabs & Navigation Summary */}
        <div className="lg:col-span-4 space-y-6">
          <div className="border border-gray-150/50 rounded-2xl p-6 bg-white/85 backdrop-blur-md shadow-xl shadow-gray-200/40 space-y-6">
            <div className="flex items-center gap-4 border-b border-gray-100 pb-5">
              <div className="h-14 w-14 rounded-full bg-[#ead2ae] text-neutral-800 font-display italic font-light text-2xl flex items-center justify-center shadow-inner">
                {firstName ? firstName[0].toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-gray-900 leading-tight truncate">{user?.name}</h2>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mt-0.5">{user?.email}</span>
              </div>
            </div>

            {/* Tab Selection buttons */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all relative ${
                  activeTab === 'profile'
                    ? 'bg-primary/10 text-primary border-l-2 border-primary'
                    : 'text-gray-600 hover:bg-[#faf9f6] hover:text-gray-900'
                }`}
              >
                <User className="w-4 h-4" /> Account Settings
              </button>

              <button
                onClick={() => setActiveTab('addresses')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all relative ${
                  activeTab === 'addresses'
                    ? 'bg-primary/10 text-primary border-l-2 border-primary'
                    : 'text-gray-600 hover:bg-[#faf9f6] hover:text-gray-900'
                }`}
              >
                <MapPin className="w-4 h-4" /> Saved Addresses
              </button>

              <button
                onClick={() => setActiveTab('orders')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all relative ${
                  activeTab === 'orders'
                    ? 'bg-primary/10 text-primary border-l-2 border-primary'
                    : 'text-gray-600 hover:bg-[#faf9f6] hover:text-gray-900'
                }`}
              >
                <Package className="w-4 h-4" /> Purchase History
              </button>
            </div>

            {/* Staff access flag */}
            {user?.role && (user.role === 'admin' || user.role === 'staff') && (
              <div className="flex items-center gap-3 bg-rose-50/50 border border-rose-100 rounded-xl p-3">
                <Shield className="w-4 h-4 text-[#d4456b] flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-[9px] text-[#d4456b] font-bold uppercase tracking-wider block">Workspace</span>
                  <Link to="/admin" className="text-[11px] font-bold text-primary hover:underline">
                    Admin Dashboard
                  </Link>
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="w-full mt-4 py-3 border border-gray-200 hover:bg-rose-50 hover:border-rose-100 hover:text-rose-600 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 text-gray-700 active:scale-[0.98]"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>

        {/* Right Side: Tab Contents Panel */}
        <div className="lg:col-span-8">
          
          {/* TAB 1: Account Profile Details, Password & Email Update */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-fade-in">
              {/* Profile Details Edit Card */}
              <div className="border border-gray-150/50 rounded-2xl p-6 bg-white/90 shadow-xl shadow-gray-200/40 space-y-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-1.5 font-display italic">
                  <User className="w-4 h-4 text-primary" /> Modify Profile details
                </h3>

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">First Name</label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-[#fcfbf9] focus:outline-none focus:border-primary focus:bg-white transition-all"
                        placeholder="First Name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Last Name</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-[#fcfbf9] focus:outline-none focus:border-primary focus:bg-white transition-all"
                        placeholder="Last Name"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Contact Number (Phone)</label>
                    <div className="relative group">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                        <Phone className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-xs bg-[#fcfbf9] focus:outline-none focus:border-primary focus:bg-white transition-all"
                        placeholder="Phone Number (10 digits)"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={updatingProfile}
                    className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {updatingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save Changes
                  </button>
                </form>
              </div>

              {/* Secure Email Verification Change Card */}
              <div className="border border-gray-150/50 rounded-2xl p-6 bg-white/90 shadow-xl shadow-gray-200/40 space-y-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-1.5 font-display italic">
                  <Mail className="w-4 h-4 text-primary" /> Update Login Email
                </h3>

                <form onSubmit={handleVerifyEmailOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">New Email Address</label>
                    <div className="relative group flex gap-2">
                      <div className="relative flex-1 group">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                          <Mail className="w-3.5 h-3.5" />
                        </span>
                        <input
                          type="email"
                          required
                          value={newEmail}
                          disabled={emailOtpSent}
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-xs bg-[#fcfbf9] focus:outline-none focus:border-primary focus:bg-white transition-all disabled:opacity-70"
                          placeholder="newemail@example.com"
                        />
                      </div>
                      {!emailOtpSent && (
                        <button
                          type="button"
                          onClick={handleSendEmailOtp}
                          disabled={sendingEmailOtp || !newEmail}
                          className="px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50 shrink-0"
                        >
                          {sendingEmailOtp ? 'Sending...' : 'Send OTP'}
                        </button>
                      )}
                    </div>
                  </div>

                  {emailOtpSent && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Enter Verification OTP</label>
                        <div className="relative group flex gap-2">
                          <div className="relative flex-1 group">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                              <Key className="w-3.5 h-3.5" />
                            </span>
                            <input
                              type="text"
                              required
                              value={emailOtp}
                              onChange={(e) => setEmailOtp(e.target.value)}
                              className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-xs bg-[#fcfbf9] focus:outline-none focus:border-primary focus:bg-white transition-all font-mono tracking-widest text-center"
                              placeholder="123456"
                              maxLength={6}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => { setEmailOtpSent(false); setEmailOtp(''); }}
                            className="px-3 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-600 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-colors shrink-0"
                          >
                            Change Email
                          </button>
                        </div>
                        <p className="text-[9px] text-emerald-600 font-medium">A verification OTP code has been sent to the new email address.</p>
                      </div>

                      <button
                        type="submit"
                        disabled={verifyingEmailOtp}
                        className="px-6 py-2.5 bg-primary hover:bg-[#b17e3f] text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {verifyingEmailOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Verify & Update Email
                      </button>
                    </div>
                  )}
                </form>
              </div>

              {/* Edit Password Card */}
              <div className="border border-gray-150/50 rounded-2xl p-6 bg-white/90 shadow-xl shadow-gray-200/40 space-y-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-1.5 font-display italic">
                  <Key className="w-4 h-4 text-primary" /> Update Password
                </h3>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Current Password</label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-[#fcfbf9] focus:outline-none focus:border-primary focus:bg-white transition-all"
                      placeholder="Enter current password"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">New Password</label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-[#fcfbf9] focus:outline-none focus:border-primary focus:bg-white transition-all"
                        placeholder="Choose new password"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Confirm New Password</label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-[#fcfbf9] focus:outline-none focus:border-primary focus:bg-white transition-all"
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={updatingPassword}
                    className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {updatingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />} Change Password
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: Addresses Management */}
          {activeTab === 'addresses' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between border border-gray-150/50 p-5 rounded-2xl bg-white/95 backdrop-blur-md shadow-xl shadow-gray-200/30">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 font-display italic">My Saved Addresses</h2>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">Manage delivery destinations for faster checkouts.</p>
                </div>
                <button
                  onClick={() => openAddressModal(null)}
                  className="px-4 py-2 bg-primary hover:bg-[#b17e3f] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Add Address
                </button>
              </div>

              {addresses.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-gray-200 rounded-2xl bg-white flex flex-col items-center justify-center">
                  <MapPin className="w-12 h-12 text-gray-300 stroke-1" />
                  <p className="mt-4 text-xs text-gray-500 font-medium">You don't have any saved addresses yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {addresses.map(addr => (
                    <div key={addr.id} className="bg-white border border-gray-150/60 rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow relative">
                      {addr.is_default === 1 && (
                        <span className="absolute top-4 right-4 text-[8px] bg-emerald-50 text-emerald-700 font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-emerald-100">
                          Default Address
                        </span>
                      )}
                      
                      <div className="space-y-2">
                        <span className="inline-block px-2 py-0.5 bg-gray-100 rounded text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                          {addr.label}
                        </span>
                        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">{addr.name}</h4>
                        <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                          {addr.line1}
                          {addr.line2 ? `, ${addr.line2}` : ''}
                          <br />
                          {addr.city}, {addr.state} - <span className="font-mono">{addr.pincode}</span>
                          <br />
                          {addr.country}
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold">Phone: {addr.phone}</p>
                      </div>

                      <div className="flex items-center gap-3 border-t border-gray-100 pt-4 mt-5 justify-end">
                        <button
                          onClick={() => openAddressModal(addr)}
                          className="px-2 py-1 text-[9px] font-bold text-primary hover:bg-gray-50 rounded uppercase tracking-wider flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="px-2 py-1 text-[9px] font-bold text-rose-500 hover:bg-rose-50 rounded uppercase tracking-wider flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Orders purchase History */}
          {activeTab === 'orders' && (
            <div className="border border-gray-150/50 rounded-2xl p-6 bg-white/90 shadow-xl shadow-gray-200/40 space-y-6 animate-fade-in">
              <h2 className="text-base font-semibold text-gray-900 font-display italic border-b border-gray-100 pb-3 flex items-center gap-1.5 mb-6">
                <Package className="w-5 h-5 text-primary" /> Purchase History
              </h2>

              {orders.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-gray-200 rounded-2xl bg-[#faf9f6] text-gray-400 text-xs font-medium">
                  You haven't placed any orders yet.
                </div>
              ) : (
                <div className="space-y-6">
                  {orders.map((order) => (
                    <div 
                      key={order.id} 
                      onClick={() => { setSelectedOrderForDetails(order); setOrderDetailsModalOpen(true); }}
                      className="border border-gray-100 rounded-xl p-4 bg-[#fcfbf9] hover:bg-[#faf9f5] transition-colors cursor-pointer relative"
                    >
                      {/* Header line */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 pb-3 text-xs text-gray-500">
                        <div>
                          Order <span className="font-bold text-gray-900">{order.order_number}</span> &middot;{' '}
                          {new Date(order.created_at).toLocaleDateString('en-IN')}
                        </div>
                        <div className="flex gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                            order.order_status === 'delivered'
                              ? 'bg-emerald-50 text-emerald-700'
                              : order.order_status === 'cancelled'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {order.order_status}
                          </span>
                          <span className="px-2.5 py-0.5 bg-gray-100 rounded-full font-bold uppercase text-[9px] text-gray-600">
                            Payment: {order.payment_status}
                          </span>
                        </div>
                      </div>

                      {/* Items snippet */}
                      {order.items && order.items.length > 0 && (
                        <div className="mt-3 space-y-3">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                              <HeicImage
                                src={item.image}
                                alt=""
                                className="w-10 h-10 object-cover rounded-md bg-white border border-gray-100 flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-semibold text-gray-800 truncate">{item.name}</h4>
                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                                  Qty: {item.qty} &middot; Color: {item.color || 'Default'} &middot; Size: {formatSizeToIndian(item.size)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Total info */}
                      <div className="flex justify-between items-center border-t border-gray-100 pt-3 mt-3">
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownloadInvoice(order.id); }}
                            className="px-3 py-1.5 border border-gray-200 hover:bg-gray-50 text-[9px] font-bold uppercase tracking-widest text-gray-650 rounded-xl flex items-center gap-1.5 transition-all active:scale-[0.98]"
                          >
                            <Printer className="w-3.5 h-3.5" /> Download Invoice
                          </button>

                          {order.order_status === 'delivered' && (() => {
                            const exStatus = getOrderExchangeStatus(order.id);
                            if (exStatus === 'pending') {
                              return (
                                <span className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold uppercase tracking-widest rounded-xl flex items-center gap-1">
                                  Exchange Pending
                                </span>
                              );
                            } else if (exStatus === 'approved') {
                              return (
                                <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold uppercase tracking-widest rounded-xl flex items-center gap-1">
                                  Exchange Approved
                                </span>
                              );
                            } else if (exStatus === 'completed') {
                              return (
                                <span className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-bold uppercase tracking-widest rounded-xl flex items-center gap-1">
                                  Exchange Completed
                                </span>
                              );
                            } else {
                              return (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleOpenExchange(order); }}
                                  className="px-3 py-1.5 bg-primary hover:bg-[#b17e3f] text-white text-[9px] font-bold uppercase tracking-widest rounded-xl flex items-center gap-1.5 transition-all active:scale-[0.98]"
                                >
                                  Request Exchange
                                </button>
                              );
                            }
                          })()}
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-gray-450 font-bold uppercase tracking-wider block">Total paid</span>
                          <span className="text-sm font-bold text-gray-950 font-mono">
                            ₹{(order.total_amount / 100).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Pop-up Glassmorphic Address Modal (Add / Edit address) */}
      {addressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm select-none">
          <div className="relative w-full max-w-lg bg-white/95 border border-gray-200 rounded-2xl shadow-2xl p-6 md:p-8 animate-slide-in space-y-5">
            
            {/* Header close button */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 font-display italic">
                {editingAddress ? 'Modify Address' : 'Add New Address'}
              </h3>
              <button
                onClick={() => setAddressModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-4">
              
              {/* Address label selector */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Address Tag / Label</label>
                <div className="flex gap-3">
                  {['Home', 'Office', 'Other'].map(lbl => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setAddressLabel(lbl)}
                      className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all ${
                        addressLabel === lbl
                          ? 'bg-primary border-primary text-white'
                          : 'border-gray-200 text-gray-650 hover:bg-gray-50'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name & Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Receiver Name</label>
                  <input
                    type="text"
                    required
                    value={addressName}
                    onChange={(e) => setAddressName(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary w-full bg-[#fcfbf9] focus:bg-white transition-all"
                    placeholder="e.g. Priyal Sharma"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Contact Phone</label>
                  <input
                    type="tel"
                    required
                    value={addressPhone}
                    onChange={(e) => setAddressPhone(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary w-full bg-[#fcfbf9] focus:bg-white transition-all"
                    placeholder="10-digit mobile number"
                  />
                </div>
              </div>

              {/* Address Lines */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Street Address</label>
                <input
                  type="text"
                  required
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-primary w-full bg-[#fcfbf9] focus:bg-white transition-all"
                  placeholder="Flat, House No., Building Name & Street"
                />
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-primary w-full bg-[#fcfbf9] focus:bg-white transition-all mt-2"
                  placeholder="Colony, Area, Landmark (Optional)"
                />
              </div>

              {/* City, State & Pincode */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">City</label>
                  <input
                    type="text"
                    required
                    value={addressCity}
                    onChange={(e) => setAddressCity(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary w-full bg-[#fcfbf9] focus:bg-white transition-all"
                    placeholder="e.g. Jodhpur"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">State</label>
                  <input
                    type="text"
                    required
                    value={addressState}
                    onChange={(e) => setAddressState(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary w-full bg-[#fcfbf9] focus:bg-white transition-all"
                    placeholder="e.g. Rajasthan"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pincode</label>
                  <input
                    type="text"
                    required
                    value={addressPincode}
                    onChange={(e) => setAddressPincode(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary w-full bg-[#fcfbf9] focus:bg-white transition-all"
                    placeholder="e.g. 342001"
                  />
                </div>
              </div>

              {/* Default address toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="defaultAddressCheckbox"
                  checked={addressDefault}
                  onChange={(e) => setAddressDefault(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="defaultAddressCheckbox" className="text-[11px] font-bold text-gray-650 uppercase tracking-wider cursor-pointer">
                  Set as default shipping address
                </label>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 justify-end border-t border-gray-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setAddressModalOpen(false)}
                  className="px-5 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="px-6 py-2.5 bg-primary hover:bg-[#b17e3f] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingAddress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {editingAddress ? 'Update' : 'Save'} Address
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Pop-up Order Details Modal */}
      {orderDetailsModalOpen && selectedOrderForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm select-none">
          <div className="relative w-full max-w-2xl bg-white/95 border border-gray-200 rounded-2xl shadow-2xl p-6 md:p-8 animate-slide-in space-y-6 overflow-y-auto max-h-[90vh]">
            
            {/* Header close button */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 font-display italic">
                  Order Details
                </h3>
                <p className="text-[10px] text-gray-450 font-mono font-bold uppercase tracking-wider mt-0.5">
                  Ref: #{selectedOrderForDetails.order_number}
                </p>
              </div>
              <button
                onClick={() => setOrderDetailsModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-650 hover:bg-gray-100 transition-all focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stepper Timeline */}
            <div className="py-4 border-b border-gray-100">
              <div className="flex items-center justify-between relative">
                {/* Horizontal connection line */}
                <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-gray-100 -z-10" />
                <div 
                  className="absolute left-6 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-500 transition-all duration-500 -z-10" 
                  style={{
                    width: selectedOrderForDetails.order_status === 'delivered' ? '100%' :
                           selectedOrderForDetails.order_status === 'out_for_delivery' ? '66%' :
                           selectedOrderForDetails.order_status === 'shipped' ? '33%' : '0%'
                  }}
                />

                {[
                  { label: 'Placed', status: 'placed', date: selectedOrderForDetails.created_at },
                  { label: 'Shipped', status: 'shipped', date: selectedOrderForDetails.shipped_at },
                  { label: 'Out for Delivery', status: 'out_for_delivery', date: selectedOrderForDetails.out_for_delivery_at },
                  { label: 'Delivered', status: 'delivered', date: selectedOrderForDetails.delivered_at }
                ].map((step, idx) => {
                  const statuses = ['placed', 'shipped', 'out_for_delivery', 'delivered'];
                  const currentIdx = statuses.indexOf(selectedOrderForDetails.order_status);
                  const stepIdx = statuses.indexOf(step.status);
                  const isActive = stepIdx <= currentIdx;
                  
                  return (
                    <div key={idx} className="flex flex-col items-center relative bg-white px-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 ${
                        selectedOrderForDetails.order_status === 'cancelled'
                          ? 'border-gray-200 text-gray-400'
                          : isActive
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-md'
                          : 'bg-white border-gray-200 text-gray-400'
                      }`}>
                        {isActive && selectedOrderForDetails.order_status !== 'cancelled' ? <Check className="w-4 h-4" /> : idx + 1}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider mt-1.5 ${
                        isActive ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {step.label}
                      </span>
                      {step.date && (
                        <span className="text-[8px] text-gray-400 mt-0.5">
                          {new Date(step.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {selectedOrderForDetails.order_status === 'cancelled' && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-750 text-center text-xs font-semibold">
                  Order was Cancelled {selectedOrderForDetails.cancelled_at && `on ${new Date(selectedOrderForDetails.cancelled_at).toLocaleDateString('en-IN')}`}
                </div>
              )}
            </div>

            {/* Main Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              
              {/* Payment & Shipping info */}
              <div className="space-y-4">
                <div className="border border-gray-100 rounded-xl p-4 bg-[#fcfbf9]">
                  <h4 className="font-bold text-gray-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    Payment Method
                  </h4>
                  <div className="space-y-1 text-gray-650">
                    <p>Method: <strong className="text-gray-900 uppercase font-mono">{selectedOrderForDetails.payment_method}</strong></p>
                    <p>Status: <strong className={`uppercase ${selectedOrderForDetails.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>{selectedOrderForDetails.payment_status}</strong></p>
                    {selectedOrderForDetails.razorpay_payment_id && (
                      <p className="font-mono text-[10px] text-gray-400 mt-1">TxID: {selectedOrderForDetails.razorpay_payment_id}</p>
                    )}
                  </div>
                </div>

                <div className="border border-gray-100 rounded-xl p-4 bg-[#fcfbf9]">
                  <h4 className="font-bold text-gray-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    Shipping Address
                  </h4>
                  <p className="font-semibold text-gray-900">{selectedOrderForDetails.customer_name}</p>
                  <p className="text-gray-450 mt-0.5">{selectedOrderForDetails.customer_phone}</p>
                  <p className="text-gray-650 mt-1.5 leading-relaxed">
                    {selectedOrderForDetails.address_line1}
                    {selectedOrderForDetails.address_line2 && `, ${selectedOrderForDetails.address_line2}`}
                    <br />
                    {selectedOrderForDetails.city}, {selectedOrderForDetails.state} - {selectedOrderForDetails.pincode}
                  </p>
                  {selectedOrderForDetails.courier_name && (
                    <div className="border-t border-gray-100 pt-2.5 mt-2.5 space-y-1">
                      <p>Courier: <strong className="text-gray-900">{selectedOrderForDetails.courier_name}</strong></p>
                      <p>Tracking No: <strong className="text-gray-900 font-mono">{selectedOrderForDetails.tracking_number}</strong></p>
                    </div>
                  )}
                </div>
              </div>

              {/* Order items & totals */}
              <div className="space-y-4">
                <div className="border border-gray-100 rounded-xl p-4 bg-[#fcfbf9] max-h-60 overflow-y-auto">
                  <h4 className="font-bold text-gray-800 uppercase tracking-wider mb-3">Items Ordered</h4>
                  <div className="space-y-3">
                    {selectedOrderForDetails.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3">
                        <HeicImage
                          src={item.image}
                          alt=""
                          className="w-10 h-10 object-cover rounded bg-white border border-gray-100 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-gray-800 truncate">{item.name}</h5>
                          <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider mt-0.5">
                            Qty: {item.qty} &middot; Size: {formatSizeToIndian(item.size)} &middot; Color: {item.color || 'Default'}
                          </p>
                        </div>
                        <div className="font-mono text-gray-900 font-bold">
                          ₹{((item.price * item.qty) / 100).toLocaleString('en-IN')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-gray-100 rounded-xl p-4 bg-[#fcfbf9] space-y-2 text-xs">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span className="font-mono">₹{(selectedOrderForDetails.subtotal_amount / 100).toFixed(2)}</span>
                  </div>
                  {selectedOrderForDetails.discount_amount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount Applied</span>
                      <span className="font-mono">-₹{(selectedOrderForDetails.discount_amount / 100).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-500">
                    <span>Shipping Charges</span>
                    <span className="font-mono">₹{(selectedOrderForDetails.shipping_amount / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 pt-2 font-bold text-gray-900 text-sm">
                    <span>Total Paid</span>
                    <span className="font-mono text-primary">₹{(selectedOrderForDetails.total_amount / 100).toFixed(2)}</span>
                  </div>
                </div>

              </div>

            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                onClick={() => setOrderDetailsModalOpen(false)}
                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Pop-up Exchange Dialog Modal */}
      {exchangeModalOpen && selectedOrderForExchange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm select-none">
          <div className="relative w-full max-w-xl bg-white/95 border border-gray-200 rounded-2xl shadow-2xl p-6 md:p-8 animate-slide-in space-y-5 overflow-y-auto max-h-[90vh]">
            
            {/* Header close button */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 font-display italic">
                Request Item Exchange
              </h3>
              <button
                onClick={() => setExchangeModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitExchange} className="space-y-4 text-xs text-gray-700">
              
              {/* Item selection */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Item to Exchange</label>
                <select
                  value={selectedItemIndex}
                  onChange={(e) => handleSelectExchangeItem(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none bg-[#fcfbf9] focus:bg-white transition-all font-semibold"
                >
                  {selectedOrderForExchange.items?.map((item: any, idx: number) => (
                    <option key={idx} value={idx}>
                      {item.name} (Size: {formatSizeToIndian(item.size)}, Color: {item.color || 'Default'}) - ₹{(item.price / 100).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Exchange Type Selection */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Exchange Option</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setExchangeType('same_variant'); loadExchangeProductDetails(selectedOrderForExchange.items[selectedItemIndex].product_id, selectedOrderForExchange.items[selectedItemIndex].price / 100); }}
                    className={`p-3 border rounded-xl font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${
                      exchangeType === 'same_variant'
                        ? 'bg-primary border-primary text-white shadow-sm'
                        : 'border-gray-200 bg-[#fcfbf9] text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="block text-xs">Size / Color Variant</span>
                    <span className={`block text-[9px] font-semibold uppercase tracking-wider ${exchangeType === 'same_variant' ? 'text-amber-100' : 'text-gray-400'}`}>Exchange for same shoe</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExchangeType('same_price')}
                    className={`p-3 border rounded-xl font-bold transition-all text-center flex flex-col items-center justify-center gap-1 ${
                      exchangeType === 'same_price'
                        ? 'bg-primary border-primary text-white shadow-sm'
                        : 'border-gray-200 bg-[#fcfbf9] text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="block text-xs">Different Product</span>
                    <span className={`block text-[9px] font-semibold uppercase tracking-wider ${exchangeType === 'same_price' ? 'text-amber-100' : 'text-gray-400'}`}>Same Price (₹{(selectedOrderForExchange.items[selectedItemIndex].price / 100).toLocaleString('en-IN')})</span>
                  </button>
                </div>
              </div>

              {/* If different product, show product list */}
              {exchangeType === 'same_price' && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Replacement Product</label>
                  <select
                    value={selectedExchangeProduct?.id || ''}
                    onChange={(e) => handleSelectExchangeProduct(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none bg-[#fcfbf9] focus:bg-white transition-all font-semibold"
                  >
                    <option value="" disabled>-- Choose a footwear style --</option>
                    {samePriceProducts.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} - ₹{p.price}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Target options (Sizes and Colors) */}
              {selectedExchangeProduct && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Desired Size</label>
                    <select
                      value={selectedExchangeSize}
                      onChange={(e) => setSelectedExchangeSize(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none bg-[#fcfbf9] focus:bg-white transition-all font-bold"
                    >
                      {exchangeSizes.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                      {exchangeSizes.length === 0 && (
                        <option value="">No sizes available</option>
                      )}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Desired Color</label>
                    <select
                      value={selectedExchangeColor}
                      onChange={(e) => handleSelectExchangeColor(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none bg-[#fcfbf9] focus:bg-white transition-all font-bold"
                    >
                      {exchangeColors.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      {exchangeColors.length === 0 && (
                        <option value="Default">Default</option>
                      )}
                    </select>
                  </div>
                </div>
              )}

              {/* Reason / Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Reason for Exchange</label>
                  <select
                    value={exchangeReason}
                    onChange={(e) => setExchangeReason(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none bg-[#fcfbf9] focus:bg-white transition-all font-semibold"
                  >
                    <option value="Size mismatch / fit issue">Size mismatch / fit issue</option>
                    <option value="Incorrect item color received">Incorrect item color received</option>
                    <option value="Defective / damaged product">Defective / damaged product</option>
                    <option value="Style swap / mind changed">Style swap / mind changed</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Details / Description</label>
                  <input
                    type="text"
                    value={exchangeDescription}
                    onChange={(e) => setExchangeDescription(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none bg-[#fcfbf9] focus:bg-white transition-all"
                    placeholder="e.g. need size 38 instead of 37"
                  />
                </div>
              </div>

              {/* Exactly 3 verification pictures */}
              <div className="space-y-2 bg-[#fcfbf9] border border-dashed border-gray-250 rounded-2xl p-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Upload Verification Photos (Exactly 3)</label>
                  <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Please upload 3 clear photos of the product condition. Max 5MB each.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[0, 1, 2].map((idx) => (
                    <div key={idx} className="space-y-1">
                      <label className="block text-[9px] font-bold text-gray-405 uppercase">Photo {idx + 1}</label>
                      <input
                        type="file"
                        accept="image/*"
                        required
                        onChange={(e) => handleFileChange(idx, e.target.files?.[0] || null)}
                        className="w-full text-[10px] text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[9px] file:font-bold file:uppercase file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 justify-end border-t border-gray-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setExchangeModalOpen(false)}
                  className="px-5 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-750 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingExchange}
                  className="px-6 py-2.5 bg-primary hover:bg-[#b17e3f] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingExchange ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Submit Exchange Request
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  )
}

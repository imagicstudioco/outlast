"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useWalletClient, usePublicClient, useConnect } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { Button } from "./Button";
import { Card } from "./Card";
import { API_BASE_URL } from '../config';
import { injected } from 'wagmi/connectors';
import { Icon } from "./Icon";
import { sdk } from '@farcaster/frame-sdk'


type AirtimeService = {
  network_operator: string;
  operator_id: string;
  amount: number;
  currency: string;
  usdc_value: number;
};

type Country = {
  name: string;
  country_code: string;
  exchange_rate: number;
  services: {
    airtime: AirtimeService[];
  };
};

// USDC Token Contract ABI
const USDC_TOKEN_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "recipient", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  }
] as const;

export function BuyAirtime() {
  console.log('BuyAirtime component mounting...');
  console.log('API_BASE_URL from config:', API_BASE_URL);
  
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] = useState("");
  const [selectedOperator, setSelectedOperator] = useState<string>("");
  const [enteredAmount, setEnteredAmount] = useState<string>("");
  const [usdAmount, setUsdAmount] = useState<number>(0);
  const [recipientPhone, setRecipientPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [transactionStatus, setTransactionStatus] = useState("");
  const [failedTransactionHash, setFailedTransactionHash] = useState<string>("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { connect } = useConnect();

  const CONTRACT_ADDRESS = "0xaF108Dd1aC530F1c4BdED13f43E336A9cec92B44" as `0x${string}`;

  console.log('BuyAirtime component state initialized');

  // Debug useEffect
  useEffect(() => {
    console.log('Debug useEffect triggered');
  }, []);

  // Auto connect wallet on component mount
  useEffect(() => {
    const autoConnect = async () => {
      try {
        if (!isConnected) {
          console.log("Attempting to auto-connect wallet...");
          await connect({ connector: injected() });
        }
      } catch (error) {
        console.error("Auto-connect failed:", error);
      }
    };
    autoConnect();
  }, [isConnected, connect]);

  // Fetch Countries and their services
  useEffect(() => {
    const fetchCountries = async () => {
      setIsLoading(true);
      setApiError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/services-data`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        if (data && data.countries && Array.isArray(data.countries)) {
          setCountries(data.countries);
        } else {
          throw new Error('Invalid data format received from API');
        }
      } catch (err) {
        console.error("Failed to fetch countries:", err);
        setApiError("Failed to connect to the server. Please check if the server is running.");
        setErrorMessage("Failed to load countries. Please try again later.");
        setShowErrorModal(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCountries();
  }, []);

  // Add console logs for country selection
  const getSelectedCountryOperators = () => {
    const country = countries.find(c => c.name === selectedCountry);
    console.log('Getting operators for country:', {
      selectedCountry,
      foundCountry: !!country,
      operators: country?.services.airtime || []
    });
    return country?.services.airtime || [];
  };

  // Add console logs for amount calculation
  useEffect(() => {
    if (enteredAmount && selectedCountry) {
      const country = countries.find(c => c.name === selectedCountry);
      console.log('Calculating USD amount:', {
        enteredAmount,
        selectedCountry,
        foundCountry: !!country,
        exchangeRate: country?.exchange_rate
      });
      
      if (country && country.exchange_rate) {
        const localAmount = parseFloat(enteredAmount);
        console.log('Amount calculation:', {
          localAmount,
          exchangeRate: country.exchange_rate,
          isValid: !isNaN(localAmount) && localAmount > 0
        });
        
        if (!isNaN(localAmount) && localAmount > 0) {
          const usdValue = localAmount / country.exchange_rate;
          console.log('USD value calculated:', usdValue);
          setUsdAmount(usdValue);
        } else {
          console.log('Invalid amount, setting USD amount to 0');
          setUsdAmount(0);
        }
      } else {
        console.log('Missing country or exchange rate, setting USD amount to 0');
        setUsdAmount(0);
      }
    } else {
      console.log('No amount or country selected, setting USD amount to 0');
      setUsdAmount(0);
    }
  }, [enteredAmount, selectedCountry, countries]);

  const handleSubmitForm = () => {
    console.log('Form submission started with values:', {
      selectedCountry,
      selectedOperator,
      enteredAmount,
      recipientPhone
    });

    if (!selectedCountry) return alert("Please select a country.");
    if (!selectedOperator) return alert("Please select an operator.");
    if (!enteredAmount || parseFloat(enteredAmount) <= 0) return alert("Please enter a valid amount.");
    if (!recipientPhone) return alert("Please enter recipient phone number.");
    
    console.log('All validations passed, showing confirmation modal');
    setShowConfirmModal(true);
  };

  // Directly transfer USDC to the contract address
  const transferUsdcDirectly = async (amount: bigint) => {
    if (!walletClient || !address || !publicClient) throw new Error("Wallet not connected");
    
    setTransactionStatus("Transferring USDC...");
    console.log(`Transferring ${formatUnits(amount, 6)} USDC to contract ${CONTRACT_ADDRESS}`);
    
    try {
      // First check if we're on the correct network
      const chainId = await publicClient.getChainId();
      const usdcAddress = chainId === 1 ? 
        "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" : // Mainnet
        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base

      // Check allowance first
      const allowance = await publicClient.readContract({
        address: usdcAddress as `0x${string}`,
        abi: USDC_TOKEN_ABI,
        functionName: "allowance",
        args: [address, CONTRACT_ADDRESS]
      });

      console.log(`Current allowance: ${formatUnits(allowance, 6)} USDC`);

      // If allowance is insufficient, approve first
      if (allowance < amount) {
        setTransactionStatus("Approving USDC spend...");
        const { request: approveRequest } = await publicClient.simulateContract({
          address: usdcAddress as `0x${string}`,
          abi: USDC_TOKEN_ABI,
          functionName: "approve",
          args: [CONTRACT_ADDRESS, amount],
          account: address
        });

        const approveTxHash = await walletClient.writeContract(approveRequest);
        console.log("Approval transaction hash:", approveTxHash);

        setTransactionStatus("Waiting for approval confirmation...");
        const approveReceipt = await publicClient.waitForTransactionReceipt({
          hash: approveTxHash,
          timeout: 60000
        });

        if (approveReceipt.status === 'reverted') {
          throw new Error("USDC approval transaction was reverted");
        }
      }

      // Now proceed with the transfer
      const { request: transferRequest } = await publicClient.simulateContract({
        address: usdcAddress as `0x${string}`,
        abi: USDC_TOKEN_ABI,
        functionName: "transfer",
        args: [CONTRACT_ADDRESS, amount],
        account: address
      });

      const transferTxHash = await walletClient.writeContract(transferRequest);
      console.log("Transfer transaction hash:", transferTxHash);

      setTransactionStatus("Waiting for transfer confirmation...");
      const transferReceipt = await publicClient.waitForTransactionReceipt({
        hash: transferTxHash,
        timeout: 60000
      });

      if (transferReceipt.status === 'reverted') {
        throw new Error("USDC transfer transaction was reverted");
      }

      console.log("USDC transfer successful");
      return transferTxHash;
    } catch (error) {
      console.error("Error transferring USDC:", error);
      throw error;
    }
  };

  const resetForm = () => {
    setSelectedCountry("");
    setSelectedCountryCode("");
    setSelectedOperator("");
    setEnteredAmount("");
    setRecipientPhone("");
  };

  const handleSubmitFailureReport = async () => {
    if (!failedTransactionHash || !address) return;
    
    setIsSubmittingReport(true);
    try {
      const response = await fetch(`${API_BASE_URL}/submit-failure-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionHash: failedTransactionHash,
          walletAddress: address,
          usdcAmount: usdAmount,
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit report');
      }

      setShowErrorModal(false);
      setFailedTransactionHash("");
      alert('Failure report submitted successfully');
    } catch (error) {
      console.error('Error submitting failure report:', error);
      alert('Failed to submit report. Please try again.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleConfirmedSubmit = async () => {
    console.log('Confirmation modal submit started');
    console.log('Selected amount details:', {
      selectedCountry,
      selectedOperator,
      enteredAmount,
      usdAmount,
      recipientPhone
    });
    
    if (!selectedCountry) {
      console.error('No country selected');
      return;
    }
    if (!selectedOperator) {
      console.error('No operator selected');
      return;
    }
    if (!enteredAmount || parseFloat(enteredAmount) <= 0) {
      console.error('Invalid amount');
      return;
    }
    if (!recipientPhone) {
      console.error('No recipient phone number');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Ensure wallet is connected
      if (!isConnected) {
        console.log("Wallet not connected, attempting to connect...");
        await connect({ connector: injected() });
      }

      if (!walletClient || !address) {
        throw new Error("Wallet connection failed. Please try again.");
      }

      // Process payment
      setTransactionStatus("Processing payment...");
      let txHash;
      try {
        // Convert USD amount to USDC (6 decimals)
        const amountInWei = parseUnits(usdAmount.toFixed(6), 6);
        txHash = await transferUsdcDirectly(amountInWei);
        console.log("Payment successful with transaction hash:", txHash);
      } catch (error) {
        console.error("Direct transfer failed:", error);
        setFailedTransactionHash(txHash || "");
        throw new Error("Payment failed. Please try again.");
      }

      // Only proceed with airtime purchase if payment is successful
      if (txHash) {
        console.log('Payment successful, proceeding with airtime purchase...');
        setTransactionStatus("Sending airtime topup request...");
        const response = await fetch(`${API_BASE_URL}/send-topup`, {
  method: "POST",
  headers: { 
    "Content-Type": "application/json",
    "Accept": "application/json"
  },
  body: JSON.stringify({
    operatorId: getSelectedCountryOperators().find(op => op.network_operator === selectedOperator)?.operator_id,
    amount: parseFloat(enteredAmount),
    currency: getSelectedCountryOperators()[0]?.currency,
    recipientPhone,
    senderPhone: "08012345678",
    recipientEmail: "miniapp@aitimeplus.xyz",
    tx_hash: txHash,
    countryCode: selectedCountryCode  // Send the country code (e.g., "NG", "US", etc.)
  }),
});


        if (!response.ok) {
          const errorData = await response.json();
          console.error('API response not ok:', errorData);
          throw new Error(errorData.error || "Network response was not ok");
        }
        
        const dataResp = await response.json();
        console.log("Topup Response:", dataResp);

        setShowConfirmModal(false);
        setShowSuccessModal(true);
        resetForm();
      }
    } catch (error) {
      console.error("Error processing transaction:", error);
      let errorMessage = "Transaction unsuccessful. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes("user rejected")) {
          errorMessage = "Transaction was rejected. Please try again.";
        } else if (error.message.includes("insufficient funds") || error.message.includes("Insufficient")) {
          errorMessage = error.message;
        } else if (error.message.includes("network")) {
          errorMessage = "Network error. Please check your connection and ensure you're on the correct network.";
        } else {
          errorMessage = error.message;
        }
      }
      
      setErrorMessage(errorMessage);
      setShowConfirmModal(false);
      setShowErrorModal(true);
    } finally {
      setIsSubmitting(false);
      setTransactionStatus("");
    }
  };

  const handleWarpcastShare = async () => {
    await sdk.actions.composeCast({
      text: "I just bought airtime using this mini app",
      embeds: ["https://farcaster.xyz/~/mini-apps/launch?domain=airtimeplus-miniapp.vercel.app"]
    });
  };


return (
  <div className="space-y-6 animate-fade-in">
    <Card title="Buy Airtime">
      <div className="space-y-4">
        <p className="text-[var(--app-foreground-muted)] dark:text-gray-400">Enter Details</p>
        
        {apiError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{apiError}</span>
          </div>
        )}

        {/* Hidden Country Code Field */}
        {selectedCountryCode && (
          <input
            type="hidden"
            name="countryCode"
            value={selectedCountryCode}
          />
        )}

        {/* Country Selection */}
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-white">Country</label>
          <select
            className="w-full border px-3 py-2 rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            value={selectedCountry}
            onChange={(e) => {
              const country = countries.find(c => c.name === e.target.value);
              setSelectedCountry(e.target.value);
              setSelectedCountryCode(country?.country_code || "");
              setSelectedOperator("");
              setEnteredAmount("");
            }}
            disabled={isLoading}
          >
            <option value="">Select Country</option>
            {countries.map((country) => (
              <option key={country.name} value={country.name}>
                {country.name}
              </option>
            ))}
          </select>
          {isLoading && (
            <p className="text-sm text-gray-500 mt-1">Loading countries...</p>
          )}
        </div>

        {/* Operator Selection */}
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-white">Operator</label>
          <select
            className="w-full border px-3 py-2 rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            value={selectedOperator}
            onChange={(e) => {
              setSelectedOperator(e.target.value);
            }}
            disabled={!selectedCountry || isLoading}
          >
            <option value="">Select Operator</option>
            {Array.from(new Set(getSelectedCountryOperators().map(op => op.network_operator))).map(operator => (
              <option key={operator} value={operator}>
                {operator}
              </option>
            ))}
          </select>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-white">Amount</label>
          <input
            type="number"
            className="w-full border px-3 py-2 rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            placeholder="Enter amount"
            value={enteredAmount}
            onChange={(e) => setEnteredAmount(e.target.value)}
            disabled={!selectedOperator || isLoading}
          />
        </div>

        {/* USD Amount Display */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">USD Amount:</span>
            <span className="text-sm font-medium text-gray-400 dark:text-white">
              {usdAmount > 0 && !isNaN(usdAmount) ? `$${usdAmount.toFixed(2)}` : 'Enter amount'}
            </span>
          </div>
        </div>

        {/* Phone Number Input */}
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-white">Recipient Phone Number</label>
          <input
            type="tel"
            className="w-full border px-3 py-2 rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            placeholder="Enter phone number"
            value={recipientPhone}
            onChange={(e) => setRecipientPhone(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="text-right">
          <Button onClick={handleSubmitForm} disabled={isSubmitting || isLoading}>
            {isSubmitting ? "Processing..." : "Buy"}
          </Button>
        </div>
      </div>
    </Card>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Please confirm the details of your airtime purchase:
            </p>
            <div className="space-y-2 mb-6">
              <p className="text-center dark:text-white">
                <span className="font-bold">Country:</span> {selectedCountry}
              </p>
              <p className="text-center dark:text-white">
                <span className="font-bold">Operator:</span> {selectedOperator}
              </p>
              <p className="text-center dark:text-white">
                <span className="font-bold">Amount:</span> {enteredAmount} {getSelectedCountryOperators()[0]?.currency}
              </p>
              <p className="text-center dark:text-white">
                <span className="font-bold">USDC Value:</span> {usdAmount > 0 && !isNaN(usdAmount) ? `$${usdAmount.toFixed(2)}` : 'Calculating...'}
              </p>
              <p className="text-center dark:text-white">
                <span className="font-bold">Recipient:</span> {recipientPhone}
              </p>
            </div>
            {transactionStatus && (
              <p className="text-blue-500 text-center mb-4">{transactionStatus}</p>
            )}
            <div className="flex justify-end space-x-4">
              <Button variant="ghost" onClick={() => {
                console.log('Edit button clicked, closing modal');
                setShowConfirmModal(false);
              }} disabled={isSubmitting}>Edit</Button>
              <Button onClick={() => {
                console.log('Confirm button clicked, starting payment process');
                handleConfirmedSubmit();
              }} disabled={isSubmitting}>
                {isSubmitting ? "Processing..." : "Confirm Purchase"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
                <Icon name="check" size="lg" className="text-red-600 dark:text-red-400 rotate-45" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Transaction Failed
              </h3>
              <p className="text-red-600 dark:text-red-400 mb-4">{errorMessage}</p>
              {failedTransactionHash && (
                <div className="mt-4">
                  <Button 
                    onClick={handleSubmitFailureReport}
                    disabled={isSubmittingReport}
                    className="w-full"
                  >
                    {isSubmittingReport ? "Submitting..." : "Submit Report"}
                  </Button>
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setShowErrorModal(false)}>Dismiss</Button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                <Icon name="check" size="lg" className="text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Airtime Sent Successfully
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your airtime transfer has been completed successfully.
              </p>
            </div>
            <div className="flex justify-center space-x-4">
              <Button onClick={() => setShowSuccessModal(false)}>
                Dismiss
              </Button>
              <Button onClick={handleWarpcastShare} variant="outline">
                Share on Warpcast
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
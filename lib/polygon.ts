import { ethers } from "ethers";

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
];

export function getProvider() {
  const rpcUrl = process.env.POLYGON_RPC_URL;
  if (!rpcUrl) throw new Error("Missing POLYGON_RPC_URL env var");
  return new ethers.JsonRpcProvider(rpcUrl);
}

export function getDistributorWallet() {
  const pk = process.env.DISTRIBUTOR_PRIVATE_KEY;
  if (!pk) throw new Error("Missing DISTRIBUTOR_PRIVATE_KEY env var");
  return new ethers.Wallet(pk, getProvider());
}

export async function sendErc20(
  contractAddress: string,
  toAddress: string,
  humanAmount: number,
  decimalsOverride?: number
) {
  const wallet = getDistributorWallet();
  const contract = new ethers.Contract(contractAddress, ERC20_ABI, wallet);
  const decimals = decimalsOverride ?? (await contract.decimals());
  const amount = ethers.parseUnits(humanAmount.toString(), decimals);
  const tx = await contract.transfer(toAddress, amount);
  const receipt = await tx.wait();
  return { hash: tx.hash, status: receipt?.status === 1 ? "success" : "failed" };
}

export async function sendNativePol(toAddress: string, humanAmount: number) {
  const wallet = getDistributorWallet();
  const tx = await wallet.sendTransaction({
    to: toAddress,
    value: ethers.parseEther(humanAmount.toString()),
  });
  const receipt = await tx.wait();
  return { hash: tx.hash, status: receipt?.status === 1 ? "success" : "failed" };
}

export async function getNativeBalance(address: string): Promise<number> {
  const provider = getProvider();
  const balance = await provider.getBalance(address);
  return Number(ethers.formatEther(balance));
}

export async function getErc20Balance(contractAddress: string, ownerAddress: string, decimalsOverride?: number): Promise<number> {
  const provider = getProvider();
  const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);
  const decimals = decimalsOverride ?? (await contract.decimals());
  const balance = await contract.balanceOf(ownerAddress);
  return Number(ethers.formatUnits(balance, decimals));
}

export function getDistributorAddress(): string {
  return getDistributorWallet().address;
}

export function isValidPolygonAddress(address: string) {
  return ethers.isAddress(address);
}

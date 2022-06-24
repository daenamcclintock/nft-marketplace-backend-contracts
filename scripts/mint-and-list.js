const { ethers } = require("hardhat")

const PRICE = ethers.utils.parseEther("0.1")

const mintAndList = async () => {
    const nftMarketplace = await ethers.getContract("NftMarketplace")
    const basicNft = await ethers.getContract("BasicNft")
    console.log("Minting NFT...")
    const mintTransaction = await basicNft.mintNft()
    const mintTransactionReceipt = await mintTransaction.wait(1)
    console.log("Mint Transaction Receipt: ", mintTransactionReceipt)

    const TOKEN_ID = mintTransactionReceipt.events[0].args.tokenId

    console.log("Approving NFT...")
    const approvalTransaction = await basicNft.approve(nftMarketplace.address, TOKEN_ID)
    await approvalTransaction.wait(1)

    console.log("Listing NFT...")
    const listTransaction = await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
    const listedTransactionReceipt = await listTransaction.wait(1)
    console.log("Listed Transaction Receipt: ", listedTransactionReceipt)
}


mintAndList()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
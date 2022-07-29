const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Nft Marketplace Unit Tests", () => {
        let nftMarketplace, nftMarketplaceContract, basicNft, basicNftContract
        const PRICE = ethers.utils.parseEther("0.1")
        const TOKEN_ID = 0

        beforeEach(async () => {
            accounts = await ethers.getSigners() // could also do with getNamedAccounts
            deployer = accounts[0]
            user = accounts[1]
            await deployments.fixture(["all"])
            nftMarketplaceContract = await ethers.getContract("NftMarketplace")
            nftMarketplace = await nftMarketplaceContract.connect(deployer)
            basicNftContract = await ethers.getContract("BasicNft")
            basicNft = await basicNftContract.connect(deployer)
            await basicNft.mintNft()
            await basicNft.approve(nftMarketplaceContract.address, TOKEN_ID)
        })

        describe("listItem", () => {
            it("emits an event after listing an item", async () => {
                expect(await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)).to.emit(
                    "ItemListed"
                )
            })
            it("exclusively items that haven't been listed", async () => {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                const error = `AlreadyListed("${basicNft.address}", ${TOKEN_ID})`
                await expect(
                    nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                ).to.be.revertedWith(error)
            })
            it("exclusively allows owners to list", async () => {
                nftMarketplace = nftMarketplaceContract.connect(user)
                await basicNft.approve(user.address, TOKEN_ID)
                await expect(
                    nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                ).to.be.revertedWith("NotOwner")
            })
            it("needs approvals to list item", async () => {
                await basicNft.approve(ethers.constants.AddressZero, TOKEN_ID)
                await expect(
                    nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                ).to.be.revertedWith("NotApprovedForMarketplace")
            })
            it("Updates listing with seller and price", async () => {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
                assert(listing.price.toString() == PRICE.toString())
                assert(listing.seller.toString() == deployer.address)
            })
        })
        
        describe("deleteListing", () => {
            it("reverts if there is no listing", async () => {
                const error = `NotListed("${basicNft.address}", ${TOKEN_ID})`
                await expect(
                    nftMarketplace.deleteListing(basicNft.address, TOKEN_ID)
                ).to.be.revertedWith(error)
            })
            it("reverts if anyone but the owner tries to call", async () => {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                nftMarketplace = nftMarketplaceContract.connect(user)
                await basicNft.approve(user.address, TOKEN_ID)
                await expect(
                    nftMarketplace.deleteListing(basicNft.address, TOKEN_ID)
                ).to.be.revertedWith("NotOwner")
            })
            it("emits event and removes listing", async () => {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                expect(await nftMarketplace.deleteListing(basicNft.address, TOKEN_ID)).to.emit(
                    "ItemCanceled"
                )
                const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
                assert(listing.price.toString() == "0")
            })
        })

        describe("buyItem", () => {
            it("reverts if the item is not listed", async () => {
                await expect(
                    nftMarketplace.buyItem(basicNft.address, TOKEN_ID)
                ).to.be.revertedWith(
                    "NotListed"
                )
            })

            it("reverts if the price is not met", async () => {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                await expect (
                    nftMarketplace.buyItem(basicNft.address, TOKEN_ID)
                ).to.be.revertedWith(
                    "PriceNotMet"
                )
            })

            it("transfers the nft to the buyer and updates internal proceeds record", async function () {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                nftMarketplace = nftMarketplaceContract.connect(user)
                expect(
                    await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
                ).to.emit(
                    "ItemBought"
                )
                const newOwner = await basicNft.ownerOf(TOKEN_ID)
                const deployerProceeds = await nftMarketplace.getProceeds(deployer.address)
                assert(newOwner.toString() == user.address)
                assert(deployerProceeds.toString() == PRICE.toString())
            })

            it("deletes the NFT from listings", async () => {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                expect(
                    await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
                ).to.emit(
                    "ItemBought"
                )
                const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
                assert(listing.price.toString() == "0")
            })
        })

        describe("updateListing", () => {
            it("reverts if the item is not listed", async () => {
                await expect(
                    nftMarketplace.updateListing(basicNft.address, TOKEN_ID, PRICE)
                ).to.be.revertedWith(
                    "NotListed"
                )
            })

            it("reverts if anyone but the owner tries to call", async () => {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                nftMarketplace = nftMarketplaceContract.connect(user)
                await basicNft.approve(user.address, TOKEN_ID)
                await expect(
                    nftMarketplace.updateListing(basicNft.address, TOKEN_ID, PRICE)
                ).to.be.revertedWith("NotOwner")
            })

            it("emits event and updates the listing price", async () => {
                const UPDATED_PRICE = ethers.utils.parseEther("0.2")
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                expect(nftMarketplace.updateListing(
                    basicNft.address, TOKEN_ID, UPDATED_PRICE
                )).to.emit("ItemUpdated")
                const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
                assert(listing.price.toString() == UPDATED_PRICE.toString())
            })
        })

        describe("withdrawProceeds", () => {
            it("reverts if there are no proceeds to withdraw", async () => {
                await expect(
                    nftMarketplace.withdrawProceeds()
                ).to.revertedWith("NoProceeds")
            })

            it("sets withdrawer balance to zero", async () => {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                nftMarketplace = nftMarketplaceContract.connect(user)
                await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
                nftMarketplace = nftMarketplaceContract.connect(deployer)

                const deployerProceedsBefore = await nftMarketplace.getProceeds(deployer.address)
                const deployerBalanceBefore = await deployer.getBalance()
                console.log(`Deployer proceeds, post sale, pre-withdrawl: ${ethers.utils.formatEther(deployerProceedsBefore)} ETH`)
                console.log(`Deployer balance, post sale, pre-withdrawl: ${ethers.utils.formatEther(deployerBalanceBefore)} ETH`)

                const transactionResponse = await nftMarketplace.withdrawProceeds()
                const transactionReceipt = await transactionResponse.wait(1)

                const { gasUsed, effectiveGasPrice } = transactionReceipt
                console.log(`Gas Used: ${ethers.utils.formatEther(gasUsed)}`)
                console.log(`Effective GasPrice: ${ethers.utils.formatEther(effectiveGasPrice)}`)
                const gasCost = gasUsed.mul(effectiveGasPrice)
                console.log(`Gas Cost: ${ethers.utils.formatEther(gasCost)}`)

                const deployerProceedsAfter = await nftMarketplace.getProceeds(deployer.address)
                const deployerBalanceAfter = await deployer.getBalance()
                console.log(`Deployer proceeds, post-withdrawl: ${ethers.utils.formatEther(deployerProceedsAfter)}`)
                console.log(`Deployer balance, post-withdrawl: ${ethers.utils.formatEther(deployerBalanceAfter)}`)

                assert(
                    deployerBalanceAfter.add(gasCost).toString() ==
                    deployerProceedsBefore.add(deployerBalanceBefore).toString()
                )
            })
        })

        describe("getListing", () => {
            it("returns the seller's proceeds after the sale of an NFT", async () => {
                await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                nftMarketplace = nftMarketplaceContract.connect(user)
                await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
                nftMarketplace = nftMarketplaceContract.connect(deployer)

                const deployerProceeds = await nftMarketplace.getProceeds(deployer.address)
                console.log(`Deployer proceeds, post sale: ${ethers.utils.formatEther(deployerProceeds)} ETH`)

                assert(ethers.utils.formatEther(deployerProceeds).toString() == ethers.utils.formatEther(PRICE).toString())
            })
        })
    })